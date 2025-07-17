
"use client"

import { useRouter } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

const PropertyFormSchema = z.object({
  address: z.string().min(5, "Please enter a valid address."),
  squareFootage: z.coerce.number().min(100, "Must be at least 100 sqft."),
  bedrooms: z.coerce.number().min(0, "Cannot be negative.").max(10, "Cannot be more than 10."),
  bathrooms: z.coerce.number().min(1, "Must have at least 1 bathroom.").max(10, "Cannot be more than 10."),
  rent: z.coerce.number().min(100, "Rent must be at least $100."),
  description: z.string().optional(),
});
type PropertyFormValues = z.infer<typeof PropertyFormSchema>;

export default function AddPropertyPage() {
  const router = useRouter();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PropertyFormValues>({
    resolver: zodResolver(PropertyFormSchema),
  });

  const onSubmit = (data: PropertyFormValues) => {
    // In a real app, you'd save this to the database.
    // For now, we'll just show a success message and move to the next step.
    console.log("Property data:", data);
    toast({
      title: "Property Added!",
      description: "Your property has been successfully saved.",
    });
    router.push('/onboarding/add-tenant');
  };

  return (
    <div className="container mx-auto flex max-w-2xl flex-col items-center justify-center p-4">
      <div className="w-full space-y-4">
        <Progress value={50} className="w-full" />
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Add Your First Property</CardTitle>
            <CardDescription>Let's start by adding details about one of your properties.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="address">Address</Label>
                <Input id="address" {...register("address")} />
                {errors.address && <p className="text-sm text-destructive mt-1">{errors.address.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rent">Monthly Rent ($)</Label>
                  <Input id="rent" type="number" {...register("rent")} />
                  {errors.rent && <p className="text-sm text-destructive mt-1">{errors.rent.message}</p>}
                </div>
                 <div>
                  <Label htmlFor="squareFootage">Square Footage</Label>
                  <Input id="squareFootage" type="number" {...register("squareFootage")} />
                  {errors.squareFootage && <p className="text-sm text-destructive mt-1">{errors.squareFootage.message}</p>}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bedrooms">Bedrooms</Label>
                  <Input id="bedrooms" type="number" {...register("bedrooms")} />
                  {errors.bedrooms && <p className="text-sm text-destructive mt-1">{errors.bedrooms.message}</p>}
                </div>
                <div>
                  <Label htmlFor="bathrooms">Bathrooms</Label>
                  <Input id="bathrooms" type="number" step="0.5" {...register("bathrooms")} />
                  {errors.bathrooms && <p className="text-sm text-destructive mt-1">{errors.bathrooms.message}</p>}
                </div>
              </div>

              <div>
                <Label htmlFor="description">Property Description (Optional)</Label>
                <Textarea id="description" placeholder="e.g., Corner unit with balcony, new appliances..." {...register("description")} />
              </div>

              <Button type="submit" className="w-full">Next: Add Tenant</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
