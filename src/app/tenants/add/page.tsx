
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

export default function AddTenantPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [propertiesLoading, setPropertiesLoading] = useState(true);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<TenantFormValues>({
    resolver: zodResolver(TenantFormSchema),
  });

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

  const onSubmit = async (data: TenantFormValues) => {
    setLoading(true);
    try {
      const response = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create tenant.');
      }
      
      toast({
        title: "Tenant Added!",
        description: "The new tenant has been successfully created.",
      });
      router.push('/tenants');
    } catch (error: any) {
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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

                <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add Tenant
                    </Button>
                </div>
                </form>
            </CardContent>
        </Card>
    </div>
  );
}
