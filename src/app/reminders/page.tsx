
"use client";

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Wand2, Calendar as CalendarIcon, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { mockTenants } from '@/lib/mock-data';
import { scheduleReminderAction, getReminderSuggestionAction, getScheduleSuggestionAction, ScheduleReminderFormValues, ScheduleReminderState } from './actions';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const ScheduleReminderFormSchema = z.object({
  tenantId: z.string().min(1, "Tenant is required."),
  reminderType: z.enum(['rentDue', 'leaseRenewal', 'maintenance']),
  scheduledFor: z.date({ required_error: "A date is required."}),
  message: z.string().min(10, "Message is required."),
});

export default function RemindersPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [suggestionResult, setSuggestionResult] = useState<ScheduleReminderState | null>(null);
  const [finalResult, setFinalResult] = useState<ScheduleReminderState | null>(null);

  const form = useForm<ScheduleReminderFormValues>({
    resolver: zodResolver(ScheduleReminderFormSchema),
    defaultValues: {
        reminderType: 'rentDue',
        message: '',
    }
  });

  const { handleSubmit, control, watch, setValue } = form;
  const tenantId = watch('tenantId');
  const reminderType = watch('reminderType');

  useEffect(() => {
    const getSuggestions = async () => {
        if (tenantId && reminderType) {
            setLoading(true);
            setSuggestionResult(null);
            
            const messagePromise = getReminderSuggestionAction({ tenantId, reminderType });
            const schedulePromise = getScheduleSuggestionAction({ tenantId, reminderType });
            
            const [messageRes, scheduleRes] = await Promise.all([messagePromise, schedulePromise]);

            if (messageRes.suggestion?.messageContent) {
                setValue('message', messageRes.suggestion.messageContent);
            }
            if (scheduleRes.suggestion?.reminderDate) {
                setValue('scheduledFor', new Date(scheduleRes.suggestion.reminderDate));
            }
            
            setSuggestionResult(scheduleRes);
            setLoading(false);
        }
    };
    getSuggestions();
  }, [tenantId, reminderType, setValue]);

  const onSubmit = async (data: ScheduleReminderFormValues) => {
    setLoading(true);
    setFinalResult(null);
    const submissionData = {
        ...data,
        scheduledFor: format(data.scheduledFor, 'yyyy-MM-dd'),
    }
    const res = await scheduleReminderAction(submissionData);
    if (res.error) {
      toast({ title: "Error", description: res.error, variant: "destructive" });
    } else {
      toast({ title: "Success!", description: res.successMessage });
      setFinalResult(res);
      form.reset();
    }
    setLoading(false);
  };
  
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Automated Reminders</h2>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Schedule a Reminder</CardTitle>
            <CardDescription>Let AI help you draft and schedule reminders for your tenants.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="tenantId">Tenant</Label>
                    <Controller
                    name="tenantId"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger id="tenantId"><SelectValue placeholder="Select a tenant..." /></SelectTrigger>
                        <SelectContent>
                            {mockTenants.map(tenant => (
                            <SelectItem key={tenant.id} value={tenant.id}>{tenant.name}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    )}
                    />
                    {form.formState.errors.tenantId && <p className="text-sm text-destructive mt-1">{form.formState.errors.tenantId.message}</p>}
                </div>

                <div>
                    <Label htmlFor="reminderType">Reminder Type</Label>
                    <Controller
                    name="reminderType"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger id="reminderType"><SelectValue placeholder="Select a type..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="rentDue">Rent Due</SelectItem>
                            <SelectItem value="leaseRenewal">Lease Renewal</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                        </SelectContent>
                        </Select>
                    )}
                    />
                </div>
              </div>

              <div>
                <Label htmlFor="scheduledFor">Schedule For</Label>
                <Controller
                    name="scheduledFor"
                    control={control}
                    render={({ field }) => (
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                    )}
                />
                 {suggestionResult?.suggestion?.reasoning && <p className="text-xs text-muted-foreground mt-1">AI Suggestion: {suggestionResult.suggestion.reasoning}</p>}
                 {form.formState.errors.scheduledFor && <p className="text-sm text-destructive mt-1">{form.formState.errors.scheduledFor.message}</p>}
              </div>

              <div>
                <Label>Message</Label>
                <Controller
                    name="message"
                    control={control}
                    render={({ field }) => (
                        <Textarea {...field} rows={8} placeholder="AI will generate a message suggestion here..."/>
                    )}
                />
                 {form.formState.errors.message && <p className="text-sm text-destructive mt-1">{form.formState.errors.message.message}</p>}
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? <Loader2 className="animate-spin" /> : <><Wand2 className="mr-2 h-4 w-4" /> Schedule Reminder</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="min-h-[400px]">
            <CardHeader>
              <CardTitle>Confirmation</CardTitle>
              <CardDescription>A confirmation will appear here once you schedule a reminder.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading && <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
                {finalResult?.successMessage && (
                    <div className="text-center text-green-600 space-y-4">
                        <CheckCircle className="h-16 w-16 mx-auto" />
                        <p className="text-lg font-semibold">Reminder Scheduled Successfully!</p>
                        <p className="text-sm text-muted-foreground">{finalResult.successMessage}</p>
                    </div>
                )}
                {finalResult?.error && (
                    <div className="text-center text-destructive">
                        <p>Something went wrong.</p>
                    </div>
                )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
