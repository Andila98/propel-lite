
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Wand2, Calendar as CalendarIcon, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Invoice } from '@/components/invoice';
import { useTenants } from '@/hooks/use-tenants';
import { ScheduleReminderFormSchema, type ScheduleReminderFormValues } from '@/lib/schemas';
import type { GenerateInvoiceOutput } from '@/lib/schema-types';
import { getReminderSuggestionAction, getScheduleSuggestionAction, scheduleReminderAction, type ScheduleReminderState } from './actions';


export default function RemindersPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [invoice, setInvoice] = useState<GenerateInvoiceOutput | null>(null);
  const [finalResult, setFinalResult] = useState<ScheduleReminderState | null>(null);
  const { tenants } = useTenants();

  const form = useForm<ScheduleReminderFormValues>({
    resolver: zodResolver(ScheduleReminderFormSchema),
    defaultValues: {
        reminderType: 'rentDue',
        message: '',
    }
  });

  const { handleSubmit, control, watch, setValue, formState: { errors } } = form;
  const tenantId = watch('tenantId');
  const reminderType = watch('reminderType');

  const getSuggestions = useCallback(async () => {
    if (tenantId && reminderType) {
        setGenerating(true);
        setInvoice(null);
        setValue('message', '');
        
        const [suggestionResult, scheduleResult] = await Promise.all([
            getReminderSuggestionAction({ tenantId, reminderType }),
            getScheduleSuggestionAction({ tenantId, reminderType }),
        ]);

        if (suggestionResult.error) {
            toast({ title: "Error", description: `Could not generate message: ${suggestionResult.error}`, variant: 'destructive'});
        } else {
            setValue('message', suggestionResult.suggestion?.messageContent || '');
            if (suggestionResult.invoice) {
              setInvoice(suggestionResult.invoice);
            }
        }
        
        if (scheduleResult.error) {
             toast({ title: "Error", description: `Could not suggest date: ${scheduleResult.error}`, variant: 'destructive'});
        } else {
            if (scheduleResult.suggestion?.reminderDate) {
                 setValue('scheduledFor', new Date(scheduleResult.suggestion.reminderDate));
            }
        }

        setGenerating(false);
    }
  }, [tenantId, reminderType, setValue, toast]);

  useEffect(() => {
    getSuggestions();
  }, [getSuggestions]);

  const onSubmit = async (data: ScheduleReminderFormValues) => {
    setLoading(true);
    setFinalResult(null);
    
    const result = await scheduleReminderAction(data);
    
    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Success!", description: result.successMessage });
      setFinalResult(result);
      form.reset({ reminderType: 'rentDue', message: '', tenantId: undefined, scheduledFor: undefined });
      setInvoice(null);
    }
    setLoading(false);
  };
  
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Automated Reminders</h2>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
        <Card className="md:col-span-2 lg:col-span-3">
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
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                        <SelectTrigger id="tenantId"><SelectValue placeholder="Select a tenant..." /></SelectTrigger>
                        <SelectContent>
                            {tenants.map(tenant => (
                            <SelectItem key={tenant.id} value={tenant.id}>{tenant.name}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    )}
                    />
                    {errors.tenantId && <p className="text-sm text-destructive mt-1">{errors.tenantId.message}</p>}
                </div>

                <div>
                    <Label htmlFor="reminderType">Reminder Type</Label>
                    <Controller
                    name="reminderType"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
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
                 {errors.scheduledFor && <p className="text-sm text-destructive mt-1">{errors.scheduledFor.message}</p>}
              </div>

              <div>
                <Label>Message</Label>
                <div className="relative">
                    <Controller
                        name="message"
                        control={control}
                        render={({ field }) => (
                            <Textarea {...field} rows={8} placeholder="AI will generate a message suggestion here..."/>
                        )}
                    />
                     {generating && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    )}
                </div>
                 {errors.message && <p className="text-sm text-destructive mt-1">{errors.message.message}</p>}
              </div>

              <Button type="submit" disabled={loading || generating} className="w-full">
                {loading ? <Loader2 className="animate-spin" /> : <><Wand2 className="mr-2 h-4 w-4" /> Schedule Reminder</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="md:col-span-2 lg:col-span-2 space-y-4">
          <Card className="min-h-[400px]">
            <CardHeader>
              <CardTitle>AI Preview</CardTitle>
              <CardDescription>A confirmation or generated content will appear here.</CardDescription>
            </CardHeader>
            <CardContent>
                {generating && <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
                
                {invoice && reminderType === 'rentDue' && (
                  <div className="space-y-4">
                    <h3 className="font-semibold">Generated Invoice</h3>
                    <Invoice invoice={invoice} />
                  </div>
                )}

                {!generating && !invoice && !finalResult && (
                    <div className="text-center text-muted-foreground pt-10">
                        <p>Select a tenant and reminder type to see AI suggestions.</p>
                    </div>
                )}
                
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
