

"use client"

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AnimatedBackIcon } from '@/components/icons/animated-back-icon';
import { useState, useEffect, useActionState } from 'react';
import { Loader2, Upload, Info, UserPlus, FileUp } from 'lucide-react';
import type { Unit, Property } from '@/lib/types';
import { TenantFormSchema, type TenantFormValues } from '@/lib/schemas';
import { useFormStatus } from 'react-dom';
import { createTenantAction, createTenantsFromCsvAction } from '../actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Papa from 'papaparse';

interface PropertiesResponse {
  properties: Property[];
  meta: {
    totalProperties: number;
    totalUnits: number;
    occupiedUnits: number;
    occupancyRate: number;
  };
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
         <Button type="submit" disabled={pending} className="w-full md:w-auto">
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Tenant
        </Button>
    )
}

function ManualAddTab({ properties, propertiesLoading, state, formAction }) {
  const {
    watch,
    control,
    setValue,
    register,
  } = useForm<TenantFormValues>({
    resolver: zodResolver(TenantFormSchema),
    defaultValues: {
        name: '',
        email: '',
        phone: '',
        propertyId: '',
        unitId: '',
        leaseStart: new Date().toISOString().split('T')[0],
        leaseEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
    }
  });

  const selectedPropertyId = watch('propertyId');
  const availableUnits = properties.find(p => p.id === selectedPropertyId)?.units?.filter((u: Unit) => !u.isOccupied) || [];

  return (
    <form action={formAction} className="space-y-4">
        <div>
            <Label htmlFor="name">Tenant Full Name</Label>
            <Input id="name" name="name" autoComplete="name" {...register('name')} />
            {state.errors?.name && <p className="text-sm text-destructive mt-1">{state.errors.name[0]}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <Label htmlFor="email">Tenant Email</Label>
                <Input id="email" name="email" type="email" autoComplete="email" {...register('email')} />
                {state.errors?.email && <p className="text-sm text-destructive mt-1">{state.errors.email[0]}</p>}
            </div>
              <div>
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input id="phone" name="phone" autoComplete="tel" {...register('phone')} />
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
                                setValue('unitId', '');
                            }} 
                            name="propertyId" 
                            defaultValue={field.value} 
                            disabled={propertiesLoading}
                        >
                        <SelectTrigger id="propertyId">
                            <SelectValue placeholder={propertiesLoading ? "Loading..." : "Select a property..."} />
                        </SelectTrigger>
                        <SelectContent>
                            {properties.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name || p.address}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    )}
                />
                  {state.errors?.propertyId && <p className="text-sm text-destructive mt-1">{state.errors.propertyId[0]}</p>}
            </div>
            <div>
                <Label htmlFor="unitId">Available Unit</Label>
                <Controller
                    name="unitId"
                    control={control}
                    render={({ field }) => (
                          <Select name="unitId" onValueChange={field.onChange} value={field.value || ''} disabled={!selectedPropertyId || availableUnits.length === 0}>
                            <SelectTrigger id="unitId">
                                <SelectValue placeholder={!selectedPropertyId ? "Select a property first" : (availableUnits.length > 0 ? "Select a unit..." : "No available units")} />
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
                  {state.errors?.unitId && <p className="text-sm text-destructive mt-1">{state.errors.unitId[0]}</p>}
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
            <Label htmlFor="leaseStart">Lease Start Date</Label>
            <Input id="leaseStart" name="leaseStart" type="date" {...register('leaseStart')} />
            {state.errors?.leaseStart && <p className="text-sm text-destructive mt-1">{state.errors.leaseStart[0]}</p>}
            </div>
            <div>
            <Label htmlFor="leaseEnd">Lease End Date</Label>
            <Input id="leaseEnd" name="leaseEnd" type="date" {...register('leaseEnd')} />
            {state.errors?.leaseEnd && <p className="text-sm text-destructive mt-1">{state.errors.leaseEnd[0]}</p>}
            </div>
        </div>

        <div className="flex justify-end pt-4">
            <SubmitButton />
        </div>
    </form>
  )
}

function BulkImportTab({ isBulkLoading, handleCsvUpload }) {
  return (
    <div className="space-y-4">
        <CardDescription>
            Upload a CSV file with your tenant data to quickly populate the system. Ensure your file has the correct headers.
        </CardDescription>
        <div className="p-6 border-2 border-dashed rounded-lg text-center">
            <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">Drop a CSV file here or click to upload</h3>
            <p className="mt-1 text-sm text-muted-foreground">This is a one-time upload for bulk creation.</p>
            <div className="mt-4">
                <Button asChild variant="outline">
                    <label htmlFor="csvFile" className="cursor-pointer">
                        {isBulkLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <FileUp className="mr-2 h-4 w-4" />
                                Select File
                            </>
                        )}
                        <input id="csvFile" name="csvFile" type="file" accept=".csv" className="sr-only" onChange={handleCsvUpload} disabled={isBulkLoading} />
                    </label>
                </Button>
            </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4" />
            Required headers: `name`, `email`, `phone`, `property_address`, `unit_number`, `lease_start`, `lease_end`.
        </div>
    </div>
  )
}

export default function AddTenantPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const [state, formAction] = useActionState(createTenantAction, { success: false, errors: undefined, error: undefined });

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
        const data: PropertiesResponse = await res.json();
        setProperties(data.properties || []);
      } catch (err: any) {
        toast({ title: "Error", description: "Could not load properties.", variant: "destructive" });
      } finally {
        setPropertiesLoading(false);
      }
    }
    fetchProperties();
  }, [toast]);

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsBulkLoading(true);

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (result) => {
            const tenantsData = result.data as any[];
             if (!tenantsData || tenantsData.length === 0) {
                toast({ title: "CSV Error", description: "CSV file is empty or invalid.", variant: "destructive" });
                setIsBulkLoading(false);
                return;
            }

            const state = await createTenantsFromCsvAction(tenantsData);

            if (state.success) {
                 toast({
                    title: "Tenants Created!",
                    description: `${state.createdCount} tenants have been successfully added.`,
                });
                router.push('/tenants');
            } else {
                 toast({
                    title: `Bulk Creation Failed: ${state.error}`,
                    description: state.details || "Please check the CSV data and try again.",
                    variant: "destructive",
                    duration: 10000,
                });
            }
            setIsBulkLoading(false);
        },
        error: (error) => {
            toast({
                title: "CSV Parsing Error",
                description: error.message,
                variant: "destructive",
            });
            setIsBulkLoading(false);
        }
    });
  };
  
  return (
    <TooltipProvider>
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
        <Tabs defaultValue="manual" className="max-w-4xl mx-auto">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual">
                    <UserPlus className="mr-2 h-4 w-4"/>
                    Add Manually
                </TabsTrigger>
                <TabsTrigger value="bulk">
                    <FileUp className="mr-2 h-4 w-4"/>
                    Bulk Import via CSV
                </TabsTrigger>
            </TabsList>
            <TabsContent value="manual">
                <Card>
                    <CardHeader>
                        <CardTitle>New Tenant Information</CardTitle>
                        <CardDescription>Enter the details for a single new tenant and assign them to an available unit.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ManualAddTab properties={properties} propertiesLoading={propertiesLoading} state={state} formAction={formAction} />
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="bulk">
                 <Card>
                    <CardHeader>
                        <CardTitle>Bulk Tenant Import</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <BulkImportTab isBulkLoading={isBulkLoading} handleCsvUpload={handleCsvUpload} />
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    </div>
    </TooltipProvider>
  );
}
