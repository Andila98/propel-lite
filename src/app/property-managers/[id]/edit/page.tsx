
"use client"

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { mockPropertyManagers } from '@/lib/mock-data';
import { ArrowLeft } from 'lucide-react';

const PropertyManagerFormSchema = z.object({
  name: z.string().min(2, "Please enter a valid name."),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().min(10, "Please enter a valid phone number."),
});
type PropertyManagerFormValues = z.infer<typeof PropertyManagerFormSchema>;

export default function EditPropertyManagerPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const managerId = params.id as string;
  const managerToEdit = mockPropertyManagers.find(t => t.id === managerId);

  const form = useForm<PropertyManagerFormValues>({
    resolver: zodResolver(PropertyManagerFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: ''
    }
  });

  useEffect(() => {
    if (managerToEdit) {
      form.reset({
        name: managerToEdit.name,
        email: managerToEdit.email,
        phone: managerToEdit.phone,
      });
    }
  }, [managerToEdit, form]);

  if (!managerToEdit) {
    return <div>Manager not found.</div>;
  }

  const { register, handleSubmit, formState: { errors } } = form;

  const onSubmit = (data: PropertyManagerFormValues) => {
    // In a real app, you'd save this to the database.
    console.log("Updated Manager data:", data);
    toast({
      title: "Manager Updated!",
      description: "The manager's information has been successfully saved.",
    });
    router.push(`/property-managers/${managerId}`);
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
       <div className="flex items-center gap-4">
            <Link href={`/property-managers/${managerId}`}>
                <Button variant="outline" size="icon" className="h-8 w-8">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back to Manager Details</span>
                </Button>
            </Link>
            <h2 className="text-3xl font-bold tracking-tight">Edit Manager</h2>
        </div>
        <div className="flex justify-center">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle>Update Manager Information</CardTitle>
                    <CardDescription>Modify the details for {managerToEdit.name}.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                      <div>
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" {...register("name")} autoComplete="name" />
                        {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
                      </div>

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
