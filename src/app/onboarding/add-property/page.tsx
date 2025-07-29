
"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from "@/components/ui/switch";
import { PlusCircle, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { PropertyFormSchema, type PropertyFormValues } from '@/lib/schemas';

export default function AddPropertyPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log("Add Property page mounted (Onboarding)");
  }, []);

  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(PropertyFormSchema),
    defaultValues: {
      address: "",
      description: "",
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

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
      const unitTypeMap: { [key: string]: 'three-bedroom' | 'bedsitter' } = {
        'house': 'three-bedroom',
        'bedsitter': 'bedsitter',
      };
      const newUnits = [{
        unitType: unitTypeMap[type],
        rent: type === 'house' ? 3500 : 1500,
        squareFootage: type === 'house' ? 1200 : 400,
        isAvailable: true,
      }];
      replace(newUnits as any);
    } else {
      replace([]);
    }
  };

  const onSubmit = async (data: PropertyFormValues) => {
    console.log("Frontend: Submitting property data from onboarding...", data);
    setLoading(true);
    if (!imageFile) {
        toast({
            title: "Image required",
            description: "Please select an image for the property.",
            variant: "destructive"
        });
        setLoading(false);
        return;
    }
    
    try {
      console.log("Frontend: Starting image upload via API (Onboarding)...");
      const formData = new FormData();
      const landlordId = "user_12345"; // In a real app, get this from auth state
      const propertyData = { ...data, landlordId };

      formData.append('media', imageFile);
      formData.append('propertyData', JSON.stringify(propertyData));

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Frontend Error: Upload failed with status", response.status, errorData);
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      console.log("Frontend: Image uploaded successfully. URL:", result.imageUrl);
      
      console.log("Frontend: Onboarding property data with image URL:", result);
      
      toast({
        title: "Property Added!",
        description: "Your property has been successfully saved.",
      });
      router.push('/onboarding/add-property-manager');

    } catch (err: any) {
        console.error("Frontend: Error during onboarding property creation or image upload:", err);
        toast({
            title: "Upload Failed",
            description: `There was an error saving your property: ${err.message}`,
            variant: "destructive"
        });
    } finally {
        setLoading(false);
    }
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
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Step 2: Add Your First Property</CardTitle>
                        <CardDescription>Let's start by adding details about one of your properties.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="sm:col-span-2">
                                  <Label htmlFor="address">Address</Label>
                                  <Input id="address" {...register("address")} autoComplete="street-address" />
                                  {errors.address && <p className="text-sm text-destructive mt-1">{errors.address.message}</p>}
                              </div>
                               <div>
                                    <Label htmlFor="imageFile">Property Image</Label>
                                    <Input id="imageFile" type="file" accept="image/*" onChange={handleFileChange} />
                                </div>
                              <div>
                                  <Label htmlFor="propertyType">Property Type</Label>
                                  <Controller
                                      name="propertyType"
                                      control={control}
                                      render={({ field }) => (
                                          <Select onValueChange={(value) => { field.onChange(value); handlePropertyTypeChange(value); }} defaultValue={field.value}>
                                          <SelectTrigger id="propertyType">
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
                            
                            <div>
                                <Label htmlFor="description">Property Description</Label>
                                <Textarea id="description" {...register("description")} placeholder="e.g., A beautiful apartment with stunning views..." />
                                {errors.description && <p className="text-sm text-destructive mt-1">{errors.description.message}</p>}
                            </div>
                        </div>
                      </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Image Preview</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="aspect-video w-full bg-muted rounded-md flex items-center justify-center overflow-hidden">
                                {previewUrl ? (
                                    <Image
                                        src={previewUrl}
                                        alt="Property Preview"
                                        width={800}
                                        height={500}
                                        className="object-contain w-full h-full"
                                        data-ai-hint="apartment building"
                                    />
                                ) : (
                                    <div className="text-muted-foreground flex flex-col items-center">
                                        <ImageIcon className="h-12 w-12" />
                                        <p>Image preview will appear here</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <div className="space-y-6">
                    {propertyType === "apartment" && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Number of Units</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Label htmlFor="numberOfUnits" className="sr-only">Number of Units</Label>
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
                            </CardContent>
                        </Card>
                    )}
                    
                    {(propertyType && fields.length > 0) && <Separator />}

                    <div className="space-y-6">
                        {fields.map((field, index) => (
                          <Card key={field.id} className="p-4">
                            <div className="flex justify-between items-center mb-4">
                              <h4 className="text-lg font-medium">
                                {propertyType === 'apartment' ? `Unit ${index + 1}` : 'Unit Details'}
                              </h4>
                              {propertyType === 'apartment' && (
                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:bg-destructive/10">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor={`units.${index}.unitType`}>Unit Type</Label>
                                <Controller
                                  name={`units.${index}.unitType`}
                                  control={control}
                                  render={({ field }) => (
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <SelectTrigger id={`units.${index}.unitType`}><SelectValue placeholder="Select type..." /></SelectTrigger>
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
                                <Label htmlFor={`units.${index}.rent`}>Monthly Rent (Ksh)</Label>
                                <Input id={`units.${index}.rent`} type="number" {...register(`units.${index}.rent`)} />
                              </div>
                              <div className="sm:col-span-2">
                                <Label htmlFor={`units.${index}.squareFootage`}>Square Footage</Label>
                                <Input id={`units.${index}.squareFootage`} type="number" {...register(`units.${index}.squareFootage`)} />
                              </div>
                              <div className="flex items-center space-x-2 sm:col-span-2 pt-2">
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
                             {errors.units?.[index] && (
                                <div className="text-sm text-destructive mt-2">
                                   {errors.units[index]?.unitType && <p>{errors.units[index]?.unitType?.message}</p>}
                                   {errors.units[index]?.rent && <p>{errors.units[index]?.rent?.message}</p>}
                                   {errors.units[index]?.squareFootage && <p>{errors.units[index]?.squareFootage?.message}</p>}
                                </div>
                              )}
                          </Card>
                        ))}
                         {propertyType === 'apartment' && (
                            <Button type="button" variant="outline" onClick={addUnit}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Another Unit
                            </Button>
                        )}
                        {errors.units && <p className="text-sm text-destructive mt-1">{errors.units.message}</p>}
                    </div>
                </div>
            </div>
            <div className="mt-8">
              <Button type="submit" className="w-full md:w-auto" disabled={loading || !propertyType}>
                 {loading ? <Loader2 className="animate-spin" /> : "Next: Add Property Manager"}
              </Button>
            </div>
        </form>
      </div>
    </div>
  );
}
