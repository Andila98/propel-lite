
"use client"

import { useState, useEffect } from 'react';
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
import { Loader2, ShieldCheck, Building } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AnimatedBackIcon } from '@/components/icons/animated-back-icon';
import type { PropertyManager, Property } from '@/lib/types';
import { permissionLabels, type Permission } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const permissionsSchema = z.object(
  Object.keys(permissionLabels).reduce((acc, key) => {
    acc[key as Permission] = z.boolean().default(false);
    return acc;
  }, {} as Record<Permission, z.ZodBoolean>)
);

const PropertyManagerFormSchema = z.object({
  name: z.string().min(2, "Please enter a valid name."),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().min(10, "Please enter a valid phone number.").optional(),
  permissions: permissionsSchema,
  propertiesManaged: z.array(z.string()).optional(),
});
type PropertyManagerFormValues = z.infer<typeof PropertyManagerFormSchema>;

export default function EditPropertyManagerPage() {
  const router = useRouter();
  const { id } = useParams();
  const { toast } = useToast();
  const managerId = id as string;

  const [managerToEdit, setManagerToEdit] = useState<PropertyManager | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const form = useForm<PropertyManagerFormValues>({
    resolver: zodResolver(PropertyManagerFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      permissions: {},
      propertiesManaged: [],
    }
  });

  useEffect(() => {
    async function fetchData() {
        if (!managerId) return;
        setLoading(true);
        try {
            const [managerRes, propertiesRes] = await Promise.all([
                fetch(`/api/managers/${managerId}`),
                fetch('/api/properties')
            ]);

            if (!managerRes.ok) throw new Error('Failed to fetch manager details.');
            const managerData = await managerRes.json();
            setManagerToEdit(managerData);

            if (!propertiesRes.ok) throw new Error('Failed to fetch properties.');
            const {properties: propertiesData} = await propertiesRes.json();
            setProperties(propertiesData);
            
            form.reset({
                name: managerData.name,
                email: managerData.email,
                phone: managerData.phone,
                permissions: managerData.permissions || {},
                propertiesManaged: managerData.propertiesManaged || [],
            });

        } catch (err: unknown) {
            const typedError = err as Error;
            toast({ title: "Error", description: typedError.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }
    fetchData();
  }, [managerId, form, toast]);


  if (loading) {
    return <div>Loading...</div>; // TODO: Skeleton
  }
  
  if (!managerToEdit) {
    return <div>Manager not found.</div>;
  }

  const { register, handleSubmit, control, formState: { errors } } = form;
  
  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[1][0]}`;
    }
    return name.substring(0, 2);
  };

  const onSubmit = async (data: PropertyManagerFormValues) => {
    setSaving(true);
    try {
        const response = await fetch(`/api/managers/${managerId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Update failed');
        }
        
        toast({
            title: "Manager Updated!",
            description: "The manager's information has been successfully saved.",
        });
        router.push(`/property-managers/${managerId}`);

    } catch (err: unknown) {
        const typedError = err as Error;
        console.error("Frontend: Error during manager update:", typedError);
        toast({
            title: "Update Failed",
            description: `There was an error saving the manager: ${typedError.message}`,
            variant: "destructive"
        });
    } finally {
        setSaving(false);
    }
  };
  
  const avatarImage = managerToEdit.avatarUrl;

  return (
    
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
       <div className="flex items-center gap-4">
            <Link href={`/property-managers/${managerId}`}>
                <Button variant="outline" size="icon" className="h-8 w-8">
                    <AnimatedBackIcon />
                    <span className="sr-only">Back to Manager Details</span>
                </Button>
            </Link>
            <h2 className="text-3xl font-bold tracking-tight">Edit Manager</h2>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-4xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Manager Information</CardTitle>
                    <CardDescription>Modify the details for {managerToEdit.name}.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex flex-col items-center gap-4 sm:flex-row">
                        <Avatar className="h-24 w-24">
                            {avatarImage ? (
                                <AvatarImage src={avatarImage} alt={managerToEdit.name} data-ai-hint="person portrait" />
                            ): (
                                <AvatarFallback className="text-3xl">
                                    {getInitials(managerToEdit.name)}
                                </AvatarFallback>
                            )}
                        </Avatar>
                    </div>

                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" {...register("name")} autoComplete="name" />
                    {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  </div>
                </CardContent>
            </Card>
            
            <Accordion type="multiple" defaultValue={['permissions', 'properties']} className="w-full space-y-4">
                <Card>
                    <AccordionItem value="permissions" className="border-b-0">
                        <AccordionTrigger className="p-6 hover:no-underline">
                             <div className="flex items-center gap-3">
                                <ShieldCheck className="h-5 w-5"/>
                                <div>
                                    <CardTitle className="text-lg">Permissions</CardTitle>
                                    <CardDescription className="text-sm text-left">Define what actions this manager can perform.</CardDescription>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-6 pt-0">
                            <Separator className="mb-6"/>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {Object.keys(permissionLabels).map((key) => (
                                    <div key={key} className="flex items-center space-x-2">
                                        <Controller
                                            name={`permissions.${key as Permission}`}
                                            control={control}
                                            render={({ field }) => (
                                                <Checkbox
                                                    id={key}
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            )}
                                        />
                                        <Label htmlFor={key} className="font-normal">
                                            {permissionLabels[key as Permission]}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Card>

                 <Card>
                    <AccordionItem value="properties" className="border-b-0">
                        <AccordionTrigger className="p-6 hover:no-underline">
                             <div className="flex items-center gap-3">
                                <Building className="h-5 w-5"/>
                                <div>
                                    <CardTitle className="text-lg">Assigned Properties</CardTitle>
                                    <CardDescription className="text-sm text-left">Grant access to specific properties.</CardDescription>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-6 pt-0">
                             <Separator className="mb-6"/>
                             <Controller
                                name="propertiesManaged"
                                control={control}
                                render={({ field }) => (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {properties.map((property) => (
                                        <div key={property.id} className="flex items-start space-x-2">
                                        <Checkbox
                                            id={`property-${property.id}`}
                                            checked={field.value?.includes(property.id)}
                                            onCheckedChange={(checked) => {
                                            const currentValues = field.value || [];
                                            return checked
                                                ? field.onChange([...currentValues, property.id])
                                                : field.onChange(currentValues.filter((id) => id !== property.id));
                                            }}
                                        />
                                        <Label htmlFor={`property-${property.id}`} className="font-normal -mt-0.5">
                                            {property.name || property.address}
                                        </Label>
                                        </div>
                                    ))}
                                    </div>
                                )}
                            />
                        </AccordionContent>
                    </AccordionItem>
                </Card>

            </Accordion>
           

              <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="animate-spin" /> : "Save Changes"}
                  </Button>
              </div>
        </form>
    </div>
    
  );
}
