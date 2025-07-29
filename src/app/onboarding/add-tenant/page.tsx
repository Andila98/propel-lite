
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

const TenantFormSchema = z.object({
  name: z.string().min(2, "Please enter a valid name."),
  email: z.string().email("Please enter a valid email address."),
  leaseStartDate: z.string().min(1, "Please select a start date"),
  leaseEndDate: z.string().min(1, "Please select an end date"),
});
type TenantFormValues = z.infer<typeof TenantFormSchema>;

export default function AddTenantPage() {
  const router = useRouter();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TenantFormValues>({
    resolver: zodResolver(TenantFormSchema),
  });

  const onSubmit = (data: TenantFormValues) => {
    // In a real app, you'd save this to the database.
    console.log("Tenant data:", data);
    toast({
      title: "Tenant Added!",
      description: "The tenant has been successfully linked to your property.",
    });
    router.push('/onboarding/complete');
  };

  return (
    <div className="container mx-auto flex max-w-2xl flex-col items-center justify-center p-4">
      <div className="w-full space-y-4">
        <Progress value={80} className="w-full" />
        <Card>
          <CardHeader>
            <CardTitle>Step 4: Add a Tenant</CardTitle>
            <CardDescription>Now, add the tenant for the property you just created.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="name">Tenant Full Name</Label>
                <Input id="name" {...register("name")} autoComplete="name" />
                {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <Label htmlFor="email">Tenant Email</Label>
                <Input id="email" type="email" {...register("email")} autoComplete="email" />
                {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="leaseStartDate">Lease Start Date</Label>
                  <Input id="leaseStartDate" type="date" {...register("leaseStartDate")} />
                  {errors.leaseStartDate && <p className="text-sm text-destructive mt-1">{errors.leaseStartDate.message}</p>}
                </div>
                <div>
                  <Label htmlFor="leaseEndDate">Lease End Date</Label>
                  <Input id="leaseEndDate" type="date" {...register("leaseEndDate")} />
                  {errors.leaseEndDate && <p className="text-sm text-destructive mt-1">{errors.leaseEndDate.message}</p>}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <Link href="/onboarding/complete">
                  <Button variant="link">Skip for now</Button>
                </Link>
                <Button type="submit">Finish Onboarding</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
