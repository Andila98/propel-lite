
"use client"

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AnimatedBackIcon } from '@/components/icons/animated-back-icon';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import type { Unit, Property } from '@/lib/types';
import { TenantFormSchema, type TenantFormValues } from '@/lib/schemas';
import { useFormState } from 'react-dom';
import { createTenantAction } from '../actions';

export default function AddTenantPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);

  const [state, formAction] = useFormState(createTenantAction, { success: false, errors: undefined, error: undefined });

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors: formErrors },
  } = useForm<TenantFormValues>({
    resolver: zodResolver(TenantFormSchema),
  });

  useEffect(() => {
    if (state.success) {
      toast({
        title: "Tenant Added!",
        description: "The new tenant has been successfully created.",
      });
      router.push('/tenants');
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
      } catch (err: any) {
        toast({ title: "Error", description: "Could not load properties.", variant: "destructive" });
      } finally {
        setPropertiesLoading(false);
      }
    }
    fetchProperties();
  }, [toast]);
  
  const selectedPropertyId = watch('propertyId');
  const availableUnits = properties.find(p => p.id === selectedPropertyId)?.units?.filter((u: Unit) => !u.isOccupied) || [];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6">
       <div className="flex items-center gap-4">
            <Link href="/tenants">
                <Button variant="outline" size="icon" className="h-8 w-8">
                    <AnimatedBackIcon />
                    <span className="sr-only">Back to Tenants</span>
                </Button>
            </Link>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Add New Tenant</h2>
        </div>
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Tenant Information</CardTitle>
                <CardDescription>Enter the details for the new tenant and assign them to a unit.</CardDescription>
            </CardHeader>
            <CardContent>
                <form action={formAction} className="space-y-4">
                <div>
                    <Label htmlFor="name">Tenant Full Name</Label>
                    <Input id="name" {...register("name")} autoComplete="name" />
                    {(formErrors.name || state.errors?.name) && <p className="text-sm text-destructive mt-1">{formErrors.name?.message || state.errors?.name?.[0]}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="email">Tenant Email</Label>
                        <Input id="email" type="email" {...register("email")} autoComplete="email" />
                        {(formErrors.email || state.errors?.email) && <p className="text-sm text-destructive mt-1">{formErrors.email?.message || state.errors?.email?.[0]}</p>}
                    </div>
                     <div>
                        <Label htmlFor="phone">Phone Number (Optional)</Label>
                        <Input id="phone" {...register("phone")} autoComplete="tel" />
                        {(formErrors.phone || state.errors?.phone) && <p className="text-sm text-destructive mt-1">{formErrors.phone?.message || state.errors?.phone?.[0]}</p>}
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
                        {(formErrors.propertyId || state.errors?.propertyId) && <p className="text-sm text-destructive mt-1">{formErrors.propertyId?.message || state.errors?.propertyId?.[0]}</p>}
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
                         {(formErrors.unitId || state.errors?.unitId) && <p className="text-sm text-destructive mt-1">{formErrors.unitId?.message || state.errors?.unitId?.[0]}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                    <Label htmlFor="leaseStart">Lease Start Date</Label>
                    <Input id="leaseStart" type="date" {...register("leaseStart")} />
                    {(formErrors.leaseStart || state.errors?.leaseStart) && <p className="text-sm text-destructive mt-1">{formErrors.leaseStart?.message || state.errors?.leaseStart?.[0]}</p>}
                    </div>
                    <div>
                    <Label htmlFor="leaseEnd">Lease End Date</Label>
                    <Input id="leaseEnd" type="date" {...register("leaseEnd")} />
                    {(formErrors.leaseEnd || state.errors?.leaseEnd) && <p className="text-sm text-destructive mt-1">{formErrors.leaseEnd?.message || state.errors?.leaseEnd?.[0]}</p>}
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <Button type="submit">
                        Add Tenant
                    </Button>
                </div>
                </form>
            </CardContent>
        </Card>
    </div>
  );
}
