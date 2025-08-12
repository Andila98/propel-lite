
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
import { useOnboardingForm } from '@/hooks/use-onboarding-form';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { Stepper } from '@/components/ui/stepper';

const onboardingSteps = [
    { id: 'welcome', label: 'Welcome' },
    { id: 'add-property', label: 'Add Property' },
    { id: 'add-manager', label: 'Add Manager' },
    { id: 'add-tenant', label: 'Add Tenant' },
    { id: 'complete', label: 'Complete' },
];

const PropertyManagerFormSchema = z.object({
  name: z.string().min(2, "Please enter a valid name."),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().min(10, "Please enter a valid phone number."),
});
type PropertyManagerFormValues = z.infer<typeof PropertyManagerFormSchema>;

export default function AddPropertyManagerPage() {
  const router = useRouter();
  const { toast } = useToast();

  const { form, setOnboardingData } = useOnboardingForm<PropertyManagerFormValues>('managerData', {
    resolver: zodResolver(PropertyManagerFormSchema),
    defaultValues: { name: "", email: "", phone: "" },
  });

  const { register, handleSubmit, formState: { errors } } = form;

  const onSubmit = (data: PropertyManagerFormValues) => {
    // In a real app, you'd save this to the database.
    console.log("Property Manager data:", data);
    setOnboardingData(data);
    toast({
      title: "Property Manager Added!",
      description: "The property manager has been successfully added.",
    });
    router.push('/onboarding/add-tenant');
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <TooltipProvider>
        <div className="mx-auto max-w-2xl space-y-8">
          <Stepper steps={onboardingSteps} currentStep={2} />
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Step 3: Add a Property Manager</CardTitle>
                 <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">A Property Manager can be a staff member or anyone you authorize to help manage your properties. You can set their permissions later.</p>
                    </TooltipContent>
                  </Tooltip>
              </div>
              <CardDescription>Enter the details of the property manager. Your progress is saved automatically.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" {...register("name")} autoComplete="name" />
                  {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...register("email")} autoComplete="email" />
                  {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
                </div>
                
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" {...register("phone")} autoComplete="tel" />
                  {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>}
                </div>

                <div className="flex justify-between">
                  <Link href="/onboarding/add-tenant">
                    <Button variant="link">Skip for now</Button>
                  </Link>
                  <Button type="submit">Next: Add Tenant</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>
    </div>
  );
}
