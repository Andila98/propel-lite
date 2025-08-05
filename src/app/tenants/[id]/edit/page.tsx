
"use client"

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AnimatedBackIcon } from '@/components/icons/animated-back-icon';
import { useProperties } from '@/hooks/use-properties';
import type { Tenant } from '@/lib/types';
import { useTenants } from '@/hooks/use-tenants';
import { useTenant } from '@/hooks/use-tenant';
import { format } from 'date-fns';

const TenantFormSchema = z.object({
  name: z.string().min(2, "Please enter a valid name."),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().optional(),
  propertyId: z.string({ required_error: "Please select a property."}),
  currentUnitId: z.string({ required_error: "Please select a unit."}),
  leaseStart: z.date({ required_error: "Lease start date is required."}),
  leaseEnd: z.date({ required_error: "Lease end date is required."}),
});
type TenantFormValues = z.infer<typeof TenantFormSchema>;

export default function EditTenantPage() {
  const router = useRouter();
  const { id } = useParams();
  const { toast } = useToast();
  const tenantId = id as string;
  const { properties } = useProperties();
  const { tenant, loading: tenantLoading } = useTenant(tenantId);

  const form = useForm<TenantFormValues>({
    resolver: zodResolver(TenantFormSchema),
  });
  
  const { register, handleSubmit, control, formState: { errors }, reset } = form;

  useEffect(() => {
    if (tenant) {
      reset({
        name: tenant.name,
        email: tenant.email,
        phone: tenant.phone,
        propertyId: tenant.currentUnitId?.split('_')[0], // Extract from unitId
        currentUnitId: tenant.currentUnitId,
        leaseStart: tenant.leaseStart.toDate(),
        leaseEnd: tenant.leaseEnd.toDate(),
      });
    }
  }, [tenant, reset]);

  if (tenantLoading) {
    return <div>Loading...</div>; // TODO Skeleton
  }

  if (!tenant) {
    return <div>Tenant not found.</div>;
  }

  const onSubmit = (data: TenantFormValues) => {
    // In a real app, you'd save this to the database.
    console.log("Updated Tenant data:", data);
    toast({
      title: "Tenant Updated!",
      description: "The tenant's information has been successfully saved.",
    });
    router.push(`/tenants/${tenantId}`);
  };
  
  const selectedPropertyId = form.watch('propertyId');
  const availableUnits = properties.find(p => p.id === selectedPropertyId)?.units || [];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
       <div className="flex items-center gap-4">
            <Link href={`/tenants/${tenantId}`}>
                <Button variant="outline" size="icon" className="h-8 w-8">
                    <AnimatedBackIcon />
                    <span className="sr-only">Back to Tenant Details</span>
                </Button>
            </Link>
            <h2 className="text-3xl font-bold tracking-tight">Edit Tenant</h2>
        </div>
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Update Tenant Information</CardTitle>
                <CardDescription>Modify the details for {tenant.name}.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                        <Label htmlFor="phone">Phone Number</Label>
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
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger id="propertyId">
                                    <SelectValue placeholder="Select a property..." />
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
                        <Label htmlFor="currentUnitId">Unit</Label>
                        <Controller
                            name="currentUnitId"
                            control={control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedPropertyId}>
                                <SelectTrigger id="currentUnitId">
                                    <SelectValue placeholder="Select a unit..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableUnits.map(u => (
                                        <SelectItem key={u.id} value={u.id}>{u.unitNumber}</SelectItem>
                                    ))}
                                </SelectContent>
                                </Select>
                            )}
                        />
                        {errors.currentUnitId && <p className="text-sm text-destructive mt-1">{errors.currentUnitId.message}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                    <Label htmlFor="leaseStart">Lease Start Date</Label>
                    <Controller
                        name="leaseStart"
                        control={control}
                        render={({ field }) => (
                             <Input id="leaseStart" type="date" value={field.value ? format(field.value, 'yyyy-MM-dd') : ''} onChange={e => field.onChange(new Date(e.target.value))} />
                        )}
                    />
                    {errors.leaseStart && <p className="text-sm text-destructive mt-1">{errors.leaseStart.message}</p>}
                    </div>
                    <div>
                    <Label htmlFor="leaseEnd">Lease End Date</Label>
                    <Controller
                        name="leaseEnd"
                        control={control}
                        render={({ field }) => (
                            <Input id="leaseEnd" type="date" value={field.value ? format(field.value, 'yyyy-MM-dd') : ''} onChange={e => field.onChange(new Date(e.target.value))} />
                        )}
                    />
                    {errors.leaseEnd && <p className="text-sm text-destructive mt-1">{errors.leaseEnd.message}</p>}
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <Button type="submit">Save Changes</Button>
                </div>
                </form>
            </CardContent>
        </Card>
    </div>
  );
}
