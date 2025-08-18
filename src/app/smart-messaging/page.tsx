
"use client";

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Loader2, Wand2, ClipboardCopy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getReminderSuggestionAction } from '../reminders/actions'; // Reusing reminder action
import type { Tenant } from '@/lib/types';
import { useTenants } from '@/hooks/use-tenants';

type MessageFormValues = {
  tenantId: string;
  reminderType: 'rentDue' | 'latePayment' | 'maintenance';
};

export default function SmartMessagingPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);
  const { tenants } = useTenants();
  
  const { handleSubmit, control, watch } = useForm<MessageFormValues>();
  
  const selectedTenantId = watch('tenantId');
  const reminderType = watch('reminderType');

  useEffect(() => {
    const getSuggestions = async () => {
        if (selectedTenantId && reminderType) {
            setLoading(true);
            const res = await getReminderSuggestionAction({ tenantId: selectedTenantId, reminderType });
            if (res.suggestion?.messageContent) {
                setGeneratedMessage(res.suggestion.messageContent);
            }
            setLoading(false);
        }
    };
    getSuggestions();
  }, [selectedTenantId, reminderType]);
  
  const handleCopy = () => {
    if (generatedMessage) {
      navigator.clipboard.writeText(generatedMessage);
      toast({ title: "Copied!", description: "Message content copied to clipboard." });
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">AI Smart Messaging</h2>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Message Generator</CardTitle>
            <CardDescription>Select a tenant and message type to generate a message.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tenantId">Tenant</Label>
                <Controller
                  name="tenantId"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger id="tenantId"><SelectValue placeholder="Select a tenant..." /></SelectTrigger>
                      <SelectContent>
                        {tenants.map(tenant => (
                          <SelectItem key={tenant.id} value={tenant.id}>{tenant.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reminderType">Message Type</Label>
                 <Controller
                  name="reminderType"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger id="reminderType"><SelectValue placeholder="Select a message type..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rentDue">Rent Due Reminder</SelectItem>
                        <SelectItem value="latePayment">Late Payment Notice</SelectItem>
                        <SelectItem value="maintenance">Maintenance Update</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="min-h-[400px] flex flex-col">
            <CardHeader>
              <CardTitle>Generated Message</CardTitle>
              <CardDescription>Review and copy the AI-generated message content.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col">
               {loading && <div className="flex justify-center items-center flex-grow"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
              {generatedMessage && !loading && (
                <div className="relative flex-grow">
                  <Textarea id="generated-message" value={generatedMessage} readOnly rows={10} className="bg-background h-full resize-none"/>
                  <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={handleCopy}>
                    <ClipboardCopy className="h-4 w-4" />
                  </Button>
                </div>
              )}
               {!loading && !generatedMessage && (
                <div className="flex justify-center items-center flex-grow">
                    <p className="text-muted-foreground">Select a tenant and type to see a message.</p>
                </div>
               )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
