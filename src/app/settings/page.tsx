
"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { useState } from "react";

const PaymentSettingsSchema = z.object({
  mpesaEnabled: z.boolean().default(false),
  mpesaPaybill: z.string().optional(),
  mpesaTill: z.string().optional(),
  stripeEnabled: z.boolean().default(false),
  stripeApiKey: z.string().optional(),
}).refine(data => {
    if (data.mpesaEnabled && !data.mpesaPaybill && !data.mpesaTill) {
        return false;
    }
    return true;
}, {
    message: "If M-Pesa is enabled, you must provide a Paybill or Till number.",
    path: ["mpesaPaybill"],
});

type PaymentSettingsFormValues = z.infer<typeof PaymentSettingsSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // In a real app, these values would be fetched from the landlord's settings in Firestore.
  const form = useForm<PaymentSettingsFormValues>({
    resolver: zodResolver(PaymentSettingsSchema),
    defaultValues: {
      mpesaEnabled: true,
      mpesaPaybill: "123456",
      mpesaTill: "",
      stripeEnabled: false,
      stripeApiKey: "",
    },
  });
  
  const { control, register, handleSubmit, watch, formState: { errors } } = form;
  const mpesaEnabled = watch('mpesaEnabled');
  const stripeEnabled = watch('stripeEnabled');


  const onSubmit = async (data: PaymentSettingsFormValues) => {
    setLoading(true);
    console.log("Saving payment settings:", data);
    // In a real app, you would save this data to Firestore.
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast({
      title: "Settings Saved",
      description: "Your payment settings have been updated successfully.",
    });
    setLoading(false);
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>
            Configure how you want to receive payments from your tenants.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-4xl">
            {/* M-Pesa Section */}
            <div className="space-y-4 p-6 border rounded-lg">
                <div className="flex items-center justify-between">
                    <Label htmlFor="mpesaEnabled" className="text-lg font-semibold">M-Pesa</Label>
                    <Controller
                        name="mpesaEnabled"
                        control={control}
                        render={({ field }) => (
                            <Switch
                                id="mpesaEnabled"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                            />
                        )}
                    />
                </div>
                {mpesaEnabled && (
                    <div className="space-y-4 pl-2">
                        <div>
                            <Label htmlFor="mpesaPaybill">Paybill Number</Label>
                            <Input id="mpesaPaybill" {...register("mpesaPaybill")} placeholder="e.g., 123456" />
                        </div>
                         <div>
                            <Label htmlFor="mpesaTill">Till Number (Optional)</Label>
                            <Input id="mpesaTill" {...register("mpesaTill")} placeholder="e.g., 654321" />
                        </div>
                    </div>
                )}
            </div>

            {/* Stripe Section */}
            <div className="space-y-4 p-6 border rounded-lg">
                 <div className="flex items-center justify-between">
                    <Label htmlFor="stripeEnabled" className="text-lg font-semibold">Stripe (Credit/Debit Card)</Label>
                    <Controller
                        name="stripeEnabled"
                        control={control}
                        render={({ field }) => (
                             <Switch
                                id="stripeEnabled"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                            />
                        )}
                    />
                </div>
                {stripeEnabled && (
                    <div className="space-y-4 pl-2">
                        <p className="text-sm text-muted-foreground">Connect your Stripe account to accept card payments.</p>
                        <Button type="button" variant="outline">Connect with Stripe</Button>
                        <Separator />
                        <div>
                            <Label htmlFor="stripeApiKey">Or enter API Key manually</Label>
                             <Input id="stripeApiKey" {...register("stripeApiKey")} type="password" placeholder="sk_test_..." />
                        </div>
                    </div>
                )}
            </div>
            {errors.mpesaPaybill && <p className="text-sm text-destructive">{errors.mpesaPaybill.message}</p>}

            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                 {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Settings
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

    