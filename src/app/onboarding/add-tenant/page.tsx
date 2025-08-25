
"use client"

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { Stepper } from '@/components/ui/stepper';
import type { Unit, Property } from '@/lib/types';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TenantFormSchema } from '@/lib/schemas';
import { useFormState, useFormStatus } from 'react-dom';
import { createTenantAction } from '@/app/tenants/actions';

type TenantFormValues = z.infer<typeof TenantFormSchema>;


const onboardingSteps = [
    { id: 'welcome', label: 'Welcome' },
    { id: 'add-property', label: 'Add Property' },
    { id: 'add-manager', label: 'Add Manager' },
    { id: 'add-tenant', label: 'Add Tenant' },
    { id: 'complete', label: 'Complete' },
];

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
         <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Tenant & Finish
        </Button>
    )
}

export default function AddTenantPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);

  const [state, formAction] = useFormState(createTenantAction, { success: false, errors: undefined, error: undefined });

  useEffect(() => {
    if (state.success) {
      toast({
        title: "Tenant Added!",
        description: "The first tenant has been successfully added.",
      });
      router.push('/onboarding/complete');
    }
    if (state.error) {
      toast({
        title: "Creation Failed",
        description: state.error,
        variant: "destructive",
      });
    }
  }, [state, router, toast]);

  useEffect(() => {
    async function fetchProperties() {
        setPropertiesLoading(true);
        try {
            const res = await fetch('/api/properties');
            if (!res.ok) throw new Error("Failed to fetch properties");
            const data = await res.json();
            setProperties(data);
        } catch (error) {
            toast({ title: "Error", description: "Could not load properties.", variant: "destructive" });
        } finally {
            setPropertiesLoading(false);
        }
    }
    fetchProperties();
  }, [toast]);


  const {
    register,
    control,
    watch,
    formState: { errors },
  } = useForm<TenantFormValues>({
    resolver: zodResolver(TenantFormSchema),
  });

  const selectedPropertyId = watch('propertyId');
  const availableUnits = properties.find(p => p.id === selectedPropertyId)?.units?.filter((u: Unit) => !u.isOccupied) || [];

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <Stepper steps={onboardingSteps} currentStep={3} />
        <Card>
          <CardHeader>
            <CardTitle>Step 4: Add Your First Tenant (Optional)</CardTitle>
            <CardDescription>Fill in the tenant's details to assign them to an available unit.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="space-y-4">
               <div>
                    <Label htmlFor="name">Tenant Full Name</Label>
                    <Input id="name" {...register("name")} autoComplete="name" />
                    {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="email">Tenant Email</Label>
                        <Input id="email" type="email" {...register("email")} autoComplete="email" />
                        {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
                    </div>
                     <div>
                        <Label htmlFor="phone">Phone Number (Optional)</Label>
                        <Input id="phone" {...register("phone")} autoComplete="tel" />
                        {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="propertyId">Property</Label>
                        <Controller
                            name="propertyId"
                            control={control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={propertiesLoading}>
                                <SelectTrigger id="propertyId">
                                    <SelectValue placeholder={propertiesLoading ? "Loading..." : "Select a property..."} />
                                </SelectTrigger>
                                <SelectContent>
                                    {properties.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.address}</SelectItem>
                                    ))}
                                </SelectContent>
                                </Select>
                            )}
                        />
                        {errors.propertyId && <p className="text-sm text-destructive mt-1">{errors.propertyId.message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="unitId">Available Unit</Label>
                        <Controller
                            name="unitId"
                            control={control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedPropertyId || availableUnits.length === 0}>
                                <SelectTrigger id="unitId">
                                    <SelectValue placeholder={availableUnits.length > 0 ? "Select a unit..." : "No available units"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableUnits.map((u: Unit) => (
                                        <SelectItem key={u.id} value={u.id}>
                                            {u.unitNumber} - {u.size} ({u.rent} {properties.find(p=>p.id === selectedPropertyId)?.currency})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                                </Select>
                            )}
                        />
                         {errors.unitId && <p className="text-sm text-destructive mt-1">{errors.unitId.message}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                    <Label htmlFor="leaseStart">Lease Start Date</Label>
                    <Input id="leaseStart" type="date" {...register("leaseStart")} />
                    {errors.leaseStart && <p className="text-sm text-destructive mt-1">{errors.leaseStart.message}</p>}
                    </div>
                    <div>
                    <Label htmlFor="leaseEnd">Lease End Date</Label>
                    <Input id="leaseEnd" type="date" {...register("leaseEnd")} />
                    {errors.leaseEnd && <p className="text-sm text-destructive mt-1">{errors.leaseEnd.message}</p>}
                    </div>
                </div>
              <div className="flex justify-between items-center pt-4">
                <Link href="/onboarding/complete">
                  <Button variant="link">Skip for now</Button>
                </Link>
                 <SubmitButton />
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
