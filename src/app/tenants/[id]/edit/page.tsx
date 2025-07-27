
"use client"

import { useEffect } from 'react';
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
import { mockProperties, mockTenants } from '@/lib/mock-data';
import { ArrowLeft } from 'lucide-react';

const TenantFormSchema = z.object({
  name: z.string().min(2, "Please enter a valid name."),
  email: z.string().email("Please enter a valid email address."),
  propertyId: z.string({ required_error: "Please select a property."}),
  leaseStartDate: z.string().min(1, "Please select a start date"),
  leaseEndDate: z.string().min(1, "Please select an end date"),
});
type TenantFormValues = z.infer<typeof TenantFormSchema>;

export default function EditTenantPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const tenantId = params.id as string;
  const tenantToEdit = mockTenants.find(t => t.id === tenantId);
  const properties = mockProperties;

  const form = useForm<TenantFormValues>({
    resolver: zodResolver(TenantFormSchema),
    defaultValues: {
      name: '',
      email: '',
    }
  });

  useEffect(() => {
    if (tenantToEdit) {
      form.reset({
        name: tenantToEdit.name,
        email: tenantToEdit.email,
        propertyId: tenantToEdit.propertyId,
        leaseStartDate: tenantToEdit.leaseStartDate,
        leaseEndDate: tenantToEdit.leaseEndDate,
      });
    }
  }, [tenantToEdit, form]);

  if (!tenantToEdit) {
    return <div>Tenant not found.</div>;
  }

  const { register, handleSubmit, control, formState: { errors } } = form;

  const onSubmit = (data: TenantFormValues) => {
    // In a real app, you'd save this to the database.
    console.log("Updated Tenant data:", data);
    toast({
      title: "Tenant Updated!",
      description: "The tenant's information has been successfully saved.",
    });
    router.push(`/tenants/${tenantId}`);
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
       <div className="flex items-center gap-4">
            <Link href={`/tenants/${tenantId}`}>
                <Button variant="outline" size="icon" className="h-8 w-8">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back to Tenant Details</span>
                </Button>
            </Link>
            <h2 className="text-3xl font-bold tracking-tight">Edit Tenant</h2>
        </div>
        <div className="flex justify-center">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle>Update Tenant Information</CardTitle>
                    <CardDescription>Modify the details for {tenantToEdit.name}.</CardDescription>
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

                    <div className="grid grid-cols-2 gap-4">
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

                    <div className="flex justify-end pt-4">
                        <Button type="submit">Save Changes</Button>
                    </div>
                    </form>
                </CardContent>
            </Card>
      </div>
    </div>
  );
}
