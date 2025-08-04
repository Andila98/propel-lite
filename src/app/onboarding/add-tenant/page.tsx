
"use client"

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { useOnboardingForm } from '@/hooks/use-onboarding-form';

const InviteTenantFormSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
});
type InviteTenantFormValues = z.infer<typeof InviteTenantFormSchema>;

export default function AddTenantPage() {
  const router = useRouter();
  const { toast } = useToast();

  const { form, setOnboardingData } = useOnboardingForm<InviteTenantFormValues>('tenantData', {
     resolver: zodResolver(InviteTenantFormSchema),
     defaultValues: { email: "" },
  });

  const { register, handleSubmit, formState: { errors } } = form;

  const onSubmit = (data: InviteTenantFormValues) => {
    // In a real app, you'd trigger a backend service to send an invite email.
    console.log("Tenant invitation data:", data);
    setOnboardingData(data);
    toast({
      title: "Invitation Sent!",
      description: `An invitation has been sent to ${data.email}.`,
    });
    router.push('/onboarding/complete');
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mx-auto max-w-2xl space-y-4">
        <Progress value={80} className="w-full" />
        <Card>
          <CardHeader>
            <CardTitle>Step 4: Invite a Tenant</CardTitle>
            <CardDescription>Send an invitation to the tenant. They can set up their account and fill in their details via a secure link.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="email">Tenant Email</Label>
                <Input id="email" type="email" {...register("email")} autoComplete="email" placeholder="tenant@example.com" />
                {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
              </div>

              <div className="flex justify-between items-center pt-4">
                <Link href="/onboarding/complete">
                  <Button variant="link">Skip for now</Button>
                </Link>
                <Button type="submit">Send Invite & Finish</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
