
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
import { AnimatedBackIcon } from '@/components/icons/animated-back-icon';
import { permissionLabels, type Permission } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';

const permissionsSchema = z.object(
  Object.keys(permissionLabels).reduce((acc, key) => {
    acc[key as Permission] = z.boolean().default(false);
    return acc;
  }, {} as Record<Permission, z.ZodBoolean>)
);

const PropertyManagerFormSchema = z.object({
  name: z.string().min(2, "Please enter a valid name."),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().min(10, "Please enter a valid phone number."),
  permissions: permissionsSchema,
});
type PropertyManagerFormValues = z.infer<typeof PropertyManagerFormSchema>;

export default function AddPropertyManagerPage() {
  const router = useRouter();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<PropertyManagerFormValues>({
    resolver: zodResolver(PropertyManagerFormSchema),
    defaultValues: {
        permissions: {
            canEditProperties: true,
            canViewPayments: true,
        }
    }
  });

  const onSubmit = (data: PropertyManagerFormValues) => {
    // In a real app, you'd save this to the database.
    console.log("Property Manager data:", data);
    toast({
      title: "Property Manager Added!",
      description: "The property manager has been successfully added.",
    });
    router.push('/property-managers');
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
       <div className="flex items-center gap-4">
            <Link href="/property-managers">
                <Button variant="outline" size="icon" className="h-8 w-8">
                    <AnimatedBackIcon />
                    <span className="sr-only">Back to Property Managers</span>
                </Button>
            </Link>
            <h2 className="text-3xl font-bold tracking-tight">Add New Manager</h2>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardDescription>Enter the details of the new property manager.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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

            <Card>
                <CardHeader>
                    <CardTitle>Permissions</CardTitle>
                    <CardDescription>Select the permissions for this manager.</CardDescription>
                </CardHeader>
                <CardContent>
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
                     {errors.permissions && <p className="text-sm text-destructive mt-1">{errors.permissions.message}</p>}
                </CardContent>
            </Card>

            <div className="flex justify-end pt-4">
                <Button type="submit">Add Manager</Button>
            </div>
        </form>
    </div>
  );
}
