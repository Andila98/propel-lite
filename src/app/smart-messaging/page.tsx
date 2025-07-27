
"use client";

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Loader2, Wand2, ClipboardCopy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { mockTenants, mockProperties } from '@/lib/mock-data';
import { generateMessageAction, type GenerateMessageState } from './actions';
import type { Tenant, Property } from '@/lib/types';

type MessageFormValues = {
  tenantId: string;
  reminderType: 'rentDue' | 'latePayment' | 'maintenance';
};

export default function SmartMessagingPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateMessageState | null>(null);
  
  const { handleSubmit, control, watch } = useForm<MessageFormValues>();
  
  const selectedTenantId = watch('tenantId');
  const selectedTenant = mockTenants.find(t => t.id === selectedTenantId);
  const selectedProperty = selectedTenant ? mockProperties.find(p => p.id === selectedTenant.propertyId) : null;

  const onSubmit = async (data: MessageFormValues) => {
    setLoading(true);
    setResult(null);
    try {
      const res = await generateMessageAction(data);
      if (res.error) {
        toast({ title: "Error", description: res.error, variant: "destructive" });
      } else {
        setResult(res);
      }
    } catch (e) {
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    }
    setLoading(false);
  };
  
  const handleCopy = () => {
    if (result?.messageContent) {
      navigator.clipboard.writeText(result.messageContent);
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
                        {mockTenants.map(tenant => (
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

              {selectedTenant && selectedProperty && (
                <Card className="bg-muted/50">
                  <CardHeader><CardTitle className="text-base">Contextual Data</CardTitle></CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-1">
                    <p><strong>Tenant:</strong> {selectedTenant.name}</p>
                    <p><strong>Property:</strong> {selectedProperty.address}</p>
                    <p><strong>Rent:</strong> ${selectedProperty.rent.toLocaleString()}</p>
                    <p><strong>Status:</strong> {selectedTenant.rentStatus}</p>
                  </CardContent>
                </Card>
              )}

              <Button type="submit" disabled={loading || !selectedTenantId} className="w-full">
                {loading ? <Loader2 className="animate-spin" /> : <><Wand2 className="mr-2 h-4 w-4" /> Generate Message</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="min-h-[400px]">
            <CardHeader>
              <CardTitle>Generated Message</CardTitle>
              <CardDescription>Review and copy the AI-generated message content.</CardDescription>
            </CardHeader>
            <CardContent>
               {loading && <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
              {result?.messageContent && (
                <div className="relative">
                  <Textarea id="generated-message" value={result.messageContent} readOnly rows={10} className="bg-background"/>
                  <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={handleCopy}>
                    <ClipboardCopy className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
