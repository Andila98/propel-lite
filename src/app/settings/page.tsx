
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
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Loader2, PlusCircle, Trash2, User, CreditCard } from "lucide-react";
import { useState, useEffect, useActionState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { updateUserProfileAction } from "./actions";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


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


function ProfileSettingsTab() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(user?.avatarUrl || null);

  const [state, formAction] = useActionState(updateUserProfileAction, { success: false });

  const form = useForm({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      avatarUrl: user?.avatarUrl || '',
    },
  });

  const { register, setValue, formState: { isSubmitting } } = form;

  useEffect(() => {
    if (state.success) {
      toast({ title: "Profile Updated", description: "Your profile has been saved successfully." });
      refreshUser();
    }
    if (state.error) {
      toast({ title: "Update Failed", description: state.error, variant: 'destructive'});
    }
  }, [state, toast, refreshUser]);
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Upload failed');
        const { url } = await res.json();
        setValue('avatarUrl', url);
        setImagePreview(url);
        toast({ title: 'Success', description: 'Avatar uploaded successfully.'});
      } catch (error: unknown) {
        const typedError = error as Error;
        toast({ title: 'Upload Error', description: 'Could not upload image.', variant: 'destructive'});
      } finally {
        setIsUploading(false);
      }
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "";
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[1][0]}`;
    }
    return name.substring(0, 2);
  };
  
  const onClientSubmit = (formData: FormData) => {
    // Append the avatarUrl to the form data being sent to the server action
    formData.append('avatarUrl', form.getValues('avatarUrl'));
    formAction(formData);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Profile</CardTitle>
        <CardDescription>Update your personal information and avatar.</CardDescription>
      </CardHeader>
      <form action={onClientSubmit}>
        <CardContent className="space-y-4">
           <div className="space-y-2">
            <Label>Profile Picture</Label>
            <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                    <AvatarImage src={imagePreview || undefined} />
                    <AvatarFallback className="text-2xl">{getInitials(user?.name || '')}</AvatarFallback>
                </Avatar>
                <Input id="avatar" type="file" onChange={handleFileChange} disabled={isUploading} className="max-w-xs" />
                {isUploading && <Loader2 className="animate-spin" />}
            </div>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" {...register("name")} />
                </div>
                <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={user?.email || ''} readOnly disabled />
                </div>
           </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
            <Button type="submit" disabled={isSubmitting || isUploading}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                Save Changes
            </Button>
        </CardFooter>
      </form>
    </Card>
  )
}


function PaymentSettingsTab() {
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
    <Card>
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
  )
}

export default function SettingsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account settings, profile, and payment configurations.
        </p>
      </div>
      <Separator className="my-6" />
      <Tabs defaultValue="profile" className="w-full">
        <TabsList>
          <TabsTrigger value="profile"><User className="mr-2 h-4 w-4" />Profile</TabsTrigger>
          <TabsTrigger value="payments"><CreditCard className="mr-2 h-4 w-4" />Payment Methods</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="mt-6">
          <ProfileSettingsTab />
        </TabsContent>
        <TabsContent value="payments" className="mt-6">
          <PaymentSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
