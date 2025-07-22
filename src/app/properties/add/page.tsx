
"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from 'next/link';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { PlusCircle, Trash2, ArrowLeft, Image as ImageIcon, Loader2 } from 'lucide-react';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const UnitSchema = z.object({
  unitType: z.enum(["one-bedroom", "two-bedroom", "three-bedroom", "bedsitter", "studio"], {
    required_error: "Please select a unit type.",
  }),
  rent: z.coerce.number().min(100, "Rent must be at least 100 Ksh."),
  squareFootage: z.coerce.number().min(100, "Must be at least 100 sqft."),
  isAvailable: z.boolean().default(true),
});

const PropertyFormSchema = z.object({
  address: z.string().min(5, "Please enter a valid address."),
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log("Frontend: AddPropertyPage component mounted.");
  }, []);

  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(PropertyFormSchema),
    defaultValues: {
      address: "",
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

  const onSubmit = async (data: PropertyFormValues) => {
    console.log("Frontend: Submitting new property data...", data);
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
      const fileRef = ref(storage, `properties/${Date.now()}_${imageFile.name}`);
      await uploadBytes(fileRef, imageFile);
      const downloadURL = await getDownloadURL(fileRef);

      const propertyData = { ...data, imageUrl: downloadURL };
      
      // In a real app, you'd save `propertyData` to Firestore here.
      console.log("Frontend: New property data with image URL:", propertyData);

      toast({
        title: "Property Added!",
        description: "Your property has been successfully saved.",
      });
      router.push('/properties');

    } catch (err) {
        console.error("Upload failed", err);
        toast({
            title: "Upload failed",
            description: "There was an error uploading the property image.",
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
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
            <Link href="/properties">
                <Button variant="outline" size="icon" className="h-8 w-8">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back to Properties</span>
                </Button>
            </Link>
            <h2 className="text-3xl font-bold tracking-tight">Add New Property</h2>
        </div>
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3">
                    <Card>
                      <CardHeader>
                        <CardDescription>Enter details about your new property.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                  <Label htmlFor="address">Address</Label>
                                  <Input id="address" {...register("address")} />
                                  {errors.address && <p className="text-sm text-destructive mt-1">{errors.address.message}</p>}
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
                                    <Label htmlFor={`units.${index}.rent`}>Monthly Rent (Ksh)</Label>
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
                      </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-2 space-y-8">
                     <Card>
                        <CardHeader>
                            <CardTitle>Property Image</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div>
                                <Label htmlFor="imageFile">Upload Image</Label>
                                <Input id="imageFile" type="file" accept="image/*" onChange={handleFileChange} />
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
            </div>
            <div className="mt-8">
                <Button type="submit" className="w-full lg:w-auto" disabled={loading || !propertyType}>
                   {loading ? <Loader2 className="animate-spin" /> : "Save Property"}
                </Button>
            </div>
        </form>
    </div>
  );
}
