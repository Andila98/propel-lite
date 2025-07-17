
"use client"

import { useRouter } from 'next/navigation';
import { useForm, Controller, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { PlusCircle, Trash2 } from 'lucide-react';

const UnitSchema = z.object({
  unitType: z.enum(["one-bedroom", "two-bedroom", "three-bedroom", "bedsitter", "studio"], {
    required_error: "Please select a unit type.",
  }),
  rent: z.coerce.number().min(100, "Rent must be at least $100."),
  squareFootage: z.coerce.number().min(100, "Must be at least 100 sqft."),
  isAvailable: z.boolean().default(true),
});

const PropertyFormSchema = z.object({
  address: z.string().min(5, "Please enter a valid address."),
  imageUrl: z.string().url("Please enter a valid image URL.").optional(),
  propertyType: z.enum(["apartment", "house", "bedsitter"], {
    required_error: "Please select a property type.",
  }),
  numberOfUnits: z.coerce.number().optional(),
  units: z.array(UnitSchema).optional(),
});
type PropertyFormValues = z.infer<typeof PropertyFormSchema>;

export default function AddPropertyPage() {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(PropertyFormSchema),
    defaultValues: {
      address: "",
      imageUrl: "",
      units: [],
    },
  });

  const { register, control, handleSubmit, formState: { errors }, setValue, watch } = form;

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "units",
  });

  const propertyType = watch("propertyType");
  const numberOfUnits = watch("numberOfUnits");

  const handleUnitGeneration = (num: number) => {
    if (isNaN(num) || num < 1) {
      replace([]);
      return;
    }
    const newUnits = Array.from({ length: num }, () => ({
      unitType: "one-bedroom",
      rent: 1000,
      squareFootage: 500,
      isAvailable: true,
    }));
    replace(newUnits);
  };

  const handlePropertyTypeChange = (type: string) => {
    setValue("propertyType", type as "apartment" | "house" | "bedsitter");
    if (type === 'apartment') {
      setValue("numberOfUnits", 1);
      handleUnitGeneration(1);
    } else if (type === 'house' || type === 'bedsitter') {
      setValue("numberOfUnits", 1);
      const unitTypeMap = {
        'house': 'three-bedroom',
        'bedsitter': 'bedsitter',
      };
      const newUnits = [{
        unitType: unitTypeMap[type],
        rent: 1500,
        squareFootage: type === 'house' ? 1200 : 400,
        isAvailable: true,
      }];
      replace(newUnits as any);
    } else {
      replace([]);
    }
  };

  const onSubmit = (data: PropertyFormValues) => {
    console.log("Property data:", data);
    toast({
      title: "Property Added!",
      description: "Your property has been successfully saved.",
    });
    router.push('/onboarding/add-property-manager');
  };
  
  const addUnit = () => {
    append({
        unitType: "one-bedroom",
        rent: 1000,
        squareFootage: 500,
        isAvailable: true,
    });
    const currentNum = numberOfUnits || 0;
    setValue("numberOfUnits", currentNum + 1);
  };


  return (
    <div className="container mx-auto flex max-w-4xl flex-col items-center justify-center p-4">
      <div className="w-full space-y-4">
        <Progress value={40} className="w-full" />
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Add Your First Property</CardTitle>
            <CardDescription>Let's start by adding details about one of your properties.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <Label htmlFor="address">Address</Label>
                      <Input id="address" {...register("address")} />
                      {errors.address && <p className="text-sm text-destructive mt-1">{errors.address.message}</p>}
                  </div>
                   <div>
                        <Label htmlFor="imageUrl">Image URL</Label>
                        <Input id="imageUrl" {...register("imageUrl")} placeholder="https://placehold.co/800x500.png" />
                        {errors.imageUrl && <p className="text-sm text-destructive mt-1">{errors.imageUrl.message}</p>}
                    </div>
                  <div>
                      <Label>Property Type</Label>
                      <Controller
                          name="propertyType"
                          control={control}
                          render={({ field }) => (
                              <Select onValueChange={(value) => handlePropertyTypeChange(value)} defaultValue={field.value}>
                              <SelectTrigger>
                                  <SelectValue placeholder="Select a type..." />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="apartment">Apartment</SelectItem>
                                  <SelectItem value="house">House</SelectItem>
                                  <SelectItem value="bedsitter">Bedsitter</SelectItem>
                              </SelectContent>
                              </Select>
                          )}
                      />
                      {errors.propertyType && <p className="text-sm text-destructive mt-1">{errors.propertyType.message}</p>}
                  </div>
                </div>

                {propertyType === "apartment" && (
                    <div>
                        <Label htmlFor="numberOfUnits">Number of Units</Label>
                        <Input 
                            id="numberOfUnits" 
                            type="number" 
                            {...register("numberOfUnits")}
                            min="1"
                            onChange={(e) => {
                                const num = parseInt(e.target.value, 10);
                                setValue("numberOfUnits", num);
                                handleUnitGeneration(num);
                            }}
                        />
                    </div>
                )}
              </div>
              
              {(propertyType && fields.length > 0) && <Separator />}

              <div className="space-y-6">
                {fields.map((field, index) => (
                  <div key={field.id} className="space-y-4 rounded-lg border p-4 relative">
                    <div className="flex justify-between items-center">
                      <Label className="text-lg font-medium">
                        {propertyType === 'apartment' ? `Unit ${index + 1}` : 'Unit Details'}
                      </Label>
                      {propertyType === 'apartment' && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <Label>Unit Type</Label>
                        <Controller
                          name={`units.${index}.unitType`}
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="studio">Studio</SelectItem>
                                <SelectItem value="bedsitter">Bedsitter</SelectItem>
                                <SelectItem value="one-bedroom">One Bedroom</SelectItem>
                                <SelectItem value="two-bedroom">Two Bedroom</SelectItem>
                                <SelectItem value="three-bedroom">Three Bedroom</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`units.${index}.rent`}>Monthly Rent ($)</Label>
                        <Input id={`units.${index}.rent`} type="number" {...register(`units.${index}.rent`)} />
                      </div>
                      <div>
                        <Label htmlFor={`units.${index}.squareFootage`}>Square Footage</Label>
                        <Input id={`units.${index}.squareFootage`} type="number" {...register(`units.${index}.squareFootage`)} />
                      </div>
                      <div className="flex flex-col justify-center space-y-2 pt-6">
                        <div className="flex items-center space-x-2">
                           <Controller
                            name={`units.${index}.isAvailable`}
                            control={control}
                            render={({ field }) => (
                                <Switch
                                    id={`units.${index}.isAvailable`}
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            )}
                            />
                          <Label htmlFor={`units.${index}.isAvailable`}>Available</Label>
                        </div>
                      </div>
                    </div>
                     {errors.units?.[index] && (
                        <div className="text-sm text-destructive mt-2">
                           {errors.units[index]?.unitType && <p>{errors.units[index]?.unitType?.message}</p>}
                           {errors.units[index]?.rent && <p>{errors.units[index]?.rent?.message}</p>}
                           {errors.units[index]?.squareFootage && <p>{errors.units[index]?.squareFootage?.message}</p>}
                        </div>
                      )}
                  </div>
                ))}
                 {propertyType === 'apartment' && (
                    <Button type="button" variant="outline" onClick={addUnit}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Another Unit
                    </Button>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={!propertyType}>Next: Add Property Manager</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
