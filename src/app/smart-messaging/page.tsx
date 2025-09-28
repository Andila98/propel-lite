
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
import { useTenants } from '@/hooks/use-tenants';
import { generateMessageAction, sendWhatsAppMessageAction } from './actions';

type MessageFormValues = {
  tenantId: string;
  reminderType: 'rentDue' | 'latePayment' | 'maintenance' | 'leaseRenewal';
};

const WhatsAppIcon = () => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 fill-current">
        <title>WhatsApp</title>
        <path d="M17.472 14.382c-.297-.149-.88-.436-1.017-.486s-.282-.074-.41-.024-.469.486-.576.582-.217.1-.416.05-.69-.247-1.308-.766-.8-.847-.925-1.141-.036-.282.036-.357.149-.185.224-.282.049-.175.024-.297-.074-.297-.099-.416-.024-.12.024-.247.1-.217.125-.292.074-.381.025-.523.025-.149.0-.357.025-.504.247s-.523.5-.623 1.225-.125 1.35.025 2.025c.149.675.797 1.325 1.296 1.725.6.45 1.35.725 2.25.925.3.075.5.05.65.025.3-.05.88-.357 1.002-.725s.125-.675.099-.725-.149-.075-.297-.15zM12 2.05A10 10 0 0 0 2.05 12a10 10 0 0 0 10 10 10 10 0 0 0 10-10 10 10 0 0 0-10-10zM12 21.95A9.95 9.95 0 0 1 2.05 12a9.95 9.95 0 0 1 9.95-9.95A9.95 9.95 0 0 1 21.95 12 9.95 9.95 0 0 1 12 21.95z"/>
    </svg>
)

export default function SmartMessagingPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);
  const { tenants } = useTenants();
  
  const { handleSubmit, control, watch } = useForm<MessageFormValues>();
  const selectedTenantId = watch('tenantId');
  
  const onSubmit: SubmitHandler<MessageFormValues> = async (data) => {
    setLoading(true);
    setGeneratedMessage(null);
    
    try {
      const result = await generateMessageAction(data);
       if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      } else {
        setGeneratedMessage(result.messageContent || '');
      }

    } catch (e: unknown) {
      const typedError = e as Error;
      toast({ title: "Error", description: typedError.message, variant: "destructive" });
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

  const handleSendWhatsApp = async () => {
      if (!generatedMessage || !selectedTenantId) {
          toast({ title: "Error", description: "Please generate a message and select a tenant first.", variant: "destructive"});
          return;
      }
      setSending(true);
      try {
          const result = await sendWhatsAppMessageAction({ tenantId: selectedTenantId, message: generatedMessage });
          if (result.error) {
              toast({ title: "Error", description: result.error, variant: "destructive"});
          } else {
              toast({ title: "Message Sent (Simulated)", description: result.successMessage });
          }
      } catch (e: unknown) {
          const typedError = e as Error;
          toast({ title: "Error", description: typedError.message, variant: "destructive" });
      } finally {
          setSending(false);
      }
  }

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
                        <SelectItem value="leaseRenewal">Lease Renewal Notice</SelectItem>
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
                   <div className="absolute top-2 right-2 flex gap-2">
                        <Button variant="ghost" size="icon" onClick={handleCopy}>
                            <ClipboardCopy className="h-4 w-4" />
                        </Button>
                         <Button variant="ghost" size="icon" onClick={handleSendWhatsApp} disabled={sending}>
                            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <WhatsAppIcon />}
                        </Button>
                   </div>
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
