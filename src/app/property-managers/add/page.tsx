
"use client"

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { AnimatedBackIcon } from '@/components/icons/animated-back-icon';

const PropertyManagerFormSchema = z.object({
  name: z.string().min(2, "Please enter a valid name."),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().min(10, "Please enter a valid phone number."),
});
type PropertyManagerFormValues = z.infer<typeof PropertyManagerFormSchema>;

export default function AddPropertyManagerPage() {
  const router = useRouter();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PropertyManagerFormValues>({
    resolver: zodResolver(PropertyManagerFormSchema),
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
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardDescription>Enter the details of the new property manager.</CardDescription>
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
                <Button type="submit">Add Manager</Button>
              </div>
            </form>
          </CardContent>
        </Card>
    </div>
  );
}
