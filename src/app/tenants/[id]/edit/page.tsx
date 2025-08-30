
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
import type { Tenant, Unit, Property } from '@/lib/types';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import { TenantUpdateSchema } from '@/lib/schemas';
import { useFormState, useFormStatus } from 'react-dom';
import { updateTenantAction } from '../../actions';

type TenantUpdateValues = z.infer<typeof TenantUpdateSchema>;

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
             {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
        </Button>
    )
}

export default function EditTenantPage() {
  const router = useRouter();
  const { id } = useParams();
  const { toast } = useToast();
  const tenantId = id as string;
  
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenantLoading, setTenantLoading] = useState(true);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  
  const updateTenantActionWithId = updateTenantAction.bind(null, tenantId);
  const [state, formAction] = useFormState(updateTenantActionWithId, { success: false, errors: undefined, error: undefined });

  const form = useForm<TenantUpdateValues>({
    resolver: zodResolver(TenantUpdateSchema),
  });
  
  const { register, control, formState: { errors }, reset, watch, getValues, setValue } = form;
  
  useEffect(() => {
    if (state.success) {
      toast({
        title: "Tenant Updated!",
        description: "The tenant's information has been successfully saved.",
      });
      router.push(`/tenants/${tenantId}`);
    }
    if (state.error) {
      toast({
        title: "Update Failed",
        description: state.error,
        variant: "destructive"
      });
    }
  }, [state, router, toast, tenantId]);

  useEffect(() => {
    async function fetchInitialData() {
        if (!tenantId) return;

        setTenantLoading(true);
        setPropertiesLoading(true);

        try {
            const [tenantRes, propertiesRes] = await Promise.all([
                fetch(`/api/tenants/${tenantId}`),
                fetch('/api/properties')
            ]);
            
            if (!tenantRes.ok) throw new Error('Failed to fetch tenant details.');
            const tenantData = await tenantRes.json();
            setTenant(tenantData);

            if (!propertiesRes.ok) throw new Error('Failed to fetch properties.');
            const propertiesData = await propertiesRes.json();
            setProperties(propertiesData);

            // Reset form with fetched data
            const leaseStart = tenantData.leaseStart ? new Date(tenantData.leaseStart) : new Date();
            const leaseEnd = tenantData.leaseEnd ? new Date(tenantData.leaseEnd) : new Date();

            reset({
                name: tenantData.name,
                email: tenantData.email,
                phone: tenantData.phone || '',
                propertyId: tenantData.propertyId,
                currentUnitId: tenantData.currentUnitId,
                leaseStart: format(leaseStart, 'yyyy-MM-dd'),
                leaseEnd: format(leaseEnd, 'yyyy-MM-dd'),
            });

        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setTenantLoading(false);
            setPropertiesLoading(false);
        }
    }
    fetchInitialData();
  }, [tenantId, reset, toast]);

  const clientAction = (formData: FormData) => {
    const values = getValues();
    // Use the value from the form state, not the server data
    formData.append('propertyId', values.propertyId);
    formData.append('currentUnitId', values.currentUnitId);
    formAction(formData);
  }
  
  const selectedPropertyId = watch('propertyId');
  const availableUnits = properties.find(p => p.id === selectedPropertyId)?.units || [];

  if (tenantLoading || propertiesLoading) {
    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
             <div className="flex items-center gap-4">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-48" />
            </div>
             <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-full max-w-sm" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        </div>
    )
  }

  if (!tenant) {
    return <div>Tenant not found.</div>;
  }

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
                <form action={clientAction} className="space-y-4">
                <div>
                    <Label htmlFor="name">Tenant Full Name</Label>
                    <Input id="name" {...register("name")} autoComplete="name" />
                    {state.errors?.name && <p className="text-sm text-destructive mt-1">{state.errors.name[0]}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="email">Tenant Email</Label>
                        <Input id="email" type="email" {...register("email")} autoComplete="email" />
                        {state.errors?.email && <p className="text-sm text-destructive mt-1">{state.errors.email[0]}</p>}
                    </div>
                    <div>
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input id="phone" {...register("phone")} autoComplete="tel" />
                        {state.errors?.phone && <p className="text-sm text-destructive mt-1">{state.errors.phone[0]}</p>}
                    </div>
                </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="propertyId">Property</Label>
                        <Controller
                            name="propertyId"
                            control={control}
                            render={({ field }) => (
                                <Select onValueChange={(value) => {
                                    field.onChange(value);
                                    setValue('currentUnitId', '');
                                }} defaultValue={field.value}>
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
                         {state.errors?.propertyId && <p className="text-sm text-destructive mt-1">{state.errors.propertyId[0]}</p>}
                    </div>
                     <div>
                        <Label htmlFor="currentUnitId">Unit</Label>
                        <Controller
                            name="currentUnitId"
                            control={control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value} disabled={!selectedPropertyId}>
                                <SelectTrigger id="currentUnitId">
                                    <SelectValue placeholder="Select a unit..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableUnits.map((u: Unit) => (
                                        <SelectItem key={u.id} value={u.id}>{u.unitNumber}</SelectItem>
                                    ))}
                                </SelectContent>
                                </Select>
                            )}
                        />
                         {state.errors?.currentUnitId && <p className="text-sm text-destructive mt-1">{state.errors.currentUnitId[0]}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                    <Label htmlFor="leaseStart">Lease Start Date</Label>
                    <Input id="leaseStart" type="date" {...register("leaseStart")} />
                     {state.errors?.leaseStart && <p className="text-sm text-destructive mt-1">{state.errors.leaseStart[0]}</p>}
                    </div>
                    <div>
                    <Label htmlFor="leaseEnd">Lease End Date</Label>
                    <Input id="leaseEnd" type="date" {...register("leaseEnd")} />
                    {state.errors?.leaseEnd && <p className="text-sm text-destructive mt-1">{state.errors.leaseEnd[0]}</p>}
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                   <SubmitButton />
                </div>
                </form>
            </CardContent>
        </Card>
    </div>
  );
}
