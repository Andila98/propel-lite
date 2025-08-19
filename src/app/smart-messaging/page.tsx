
"use client";

import { useState } from 'react';
import { useForm, Controller, type SubmitHandler } from 'react-hook-form';
import { Loader2, Wand2, ClipboardCopy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
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
  
  const { handleSubmit, control } = useForm<MessageFormValues>();
  
  const onSubmit: SubmitHandler<MessageFormValues> = async (data) => {
    setLoading(true);
    setGeneratedMessage(null);
    const tenant = tenants.find(t => t.id === data.tenantId);
    if (!tenant) {
      toast({ title: "Error", description: "Tenant not found", variant: "destructive" });
      setLoading(false);
      return;
    }

    try {
      // Mock AI generation
      await new Promise(res => setTimeout(res, 1000));

      let message = '';
        switch(data.reminderType) {
            case 'rentDue':
                message = `Hi ${tenant?.name}, this is a friendly reminder that your rent is due soon. Thanks!`;
                break;
            case 'latePayment':
                message = `Hi ${tenant?.name}, this is a notice that your rent is now overdue. Please make a payment as soon as possible.`;
                break;
            case 'maintenance':
                message = `Hi ${tenant?.name}, just a heads up about scheduled maintenance in the building next week. We'll provide more details soon.`;
                break;
        }

      setGeneratedMessage(message);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  
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
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? <Loader2 className="animate-spin" /> : <><Wand2 className="mr-2 h-4 w-4" /> Generate Message</>}
              </Button>
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
                    <p className="text-muted-foreground">Results will appear here.</p>
                </div>
               )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
