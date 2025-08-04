
"use client";

import { useForm, Controller, useFieldArray } from "react-hook-form";
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
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const PaymentProfileSchema = z.object({
    profileName: z.string().min(1, "Profile name is required."),
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

const SettingsFormSchema = z.object({
    profiles: z.array(PaymentProfileSchema)
});

type SettingsFormValues = z.infer<typeof SettingsFormSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // In a real app, these values would be fetched from the landlord's settings in Firestore.
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(SettingsFormSchema),
    defaultValues: {
      profiles: [{
          profileName: "Default Profile",
          mpesaEnabled: true,
          mpesaPaybill: "123456",
          mpesaTill: "",
          stripeEnabled: false,
          stripeApiKey: "",
      }],
    },
  });
  
  const { control, register, handleSubmit, watch, formState: { errors } } = form;
  
  const { fields, append, remove } = useFieldArray({
      control,
      name: "profiles",
  });

  const onSubmit = async (data: SettingsFormValues) => {
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
  
  const addProfile = () => {
    append({
        profileName: `Profile ${fields.length + 1}`,
        mpesaEnabled: false,
        stripeEnabled: false,
    });
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
      </div>
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>
            Configure how you want to receive payments from your tenants by creating payment profiles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <Accordion type="multiple" defaultValue={['item-0']} className="w-full">
                {fields.map((field, index) => {
                    const mpesaEnabled = watch(`profiles.${index}.mpesaEnabled`);
                    const stripeEnabled = watch(`profiles.${index}.stripeEnabled`);
                    return (
                        <AccordionItem value={`item-${index}`} key={field.id} className="border-b-0">
                             <Card className="border">
                                <AccordionTrigger className="p-6">
                                     <div className="flex justify-between items-center w-full">
                                         <div className="text-left">
                                             <h4 className="font-semibold">{watch(`profiles.${index}.profileName`)}</h4>
                                             <p className="text-sm text-muted-foreground">Click to expand and edit profile.</p>
                                         </div>
                                         {fields.length > 1 && (
                                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                         )}
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-6 pt-0">
                                    <div className="space-y-4">
                                        <div>
                                            <Label htmlFor={`profiles.${index}.profileName`}>Profile Name</Label>
                                            <Input id={`profiles.${index}.profileName`} {...register(`profiles.${index}.profileName`)} />
                                            {errors.profiles?.[index]?.profileName && <p className="text-sm text-destructive mt-1">{errors.profiles?.[index]?.profileName?.message}</p>}
                                        </div>
                                        <Separator />
                                         {/* M-Pesa Section */}
                                        <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor={`profiles.${index}.mpesaEnabled`} className="text-lg font-semibold">M-Pesa</Label>
                                                <Controller
                                                    name={`profiles.${index}.mpesaEnabled`}
                                                    control={control}
                                                    render={({ field }) => (
                                                        <Switch
                                                            id={`profiles.${index}.mpesaEnabled`}
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    )}
                                                />
                                            </div>
                                            {mpesaEnabled && (
                                                <div className="space-y-4 pl-2">
                                                    <div>
                                                        <Label htmlFor={`profiles.${index}.mpesaPaybill`}>Paybill Number</Label>
                                                        <Input id={`profiles.${index}.mpesaPaybill`} {...register(`profiles.${index}.mpesaPaybill`)} placeholder="e.g., 123456" />
                                                    </div>
                                                    <div>
                                                        <Label htmlFor={`profiles.${index}.mpesaTill`}>Till Number (Optional)</Label>
                                                        <Input id={`profiles.${index}.mpesaTill`} {...register(`profiles.${index}.mpesaTill`)} placeholder="e.g., 654321" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Stripe Section */}
                                        <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor={`profiles.${index}.stripeEnabled`} className="text-lg font-semibold">Stripe (Credit/Debit Card)</Label>
                                                <Controller
                                                    name={`profiles.${index}.stripeEnabled`}
                                                    control={control}
                                                    render={({ field }) => (
                                                        <Switch
                                                            id={`profiles.${index}.stripeEnabled`}
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
                                                        <Label htmlFor={`profiles.${index}.stripeApiKey`}>Or enter API Key manually</Label>
                                                        <Input id={`profiles.${index}.stripeApiKey`} {...register(`profiles.${index}.stripeApiKey`)} type="password" placeholder="sk_test_..." />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                         {errors.profiles?.[index]?.mpesaPaybill && <p className="text-sm text-destructive">{errors.profiles?.[index]?.mpesaPaybill?.message}</p>}
                                    </div>
                                </AccordionContent>
                             </Card>
                        </AccordionItem>
                    )
                })}
            </Accordion>
            
            <Button type="button" variant="outline" onClick={addProfile}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Profile
            </Button>
            
            <Separator />

            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                 {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save All Settings
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
