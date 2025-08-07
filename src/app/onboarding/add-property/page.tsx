
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
import { PlusCircle, Image as ImageIcon, Loader2, Upload, Info } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { PropertyFormSchema, type PropertyFormValues } from '@/lib/schemas';
import { AnimatedDeleteIcon } from '@/components/icons/animated-delete-icon';
import { useOnboardingForm } from '@/hooks/use-onboarding-form';
import Papa from 'papaparse';
import type { Unit } from '@/lib/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function AddPropertyPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { form, setOnboardingData } = useOnboardingForm<PropertyFormValues>('propertyData', {
    resolver: zodResolver(PropertyFormSchema),
    defaultValues: {
      name: "",
      address: "",
      description: "",
      currency: "KES",
      units: [],
    },
  });

  const { register, control, handleSubmit, formState: { errors }, setValue, watch, getValues } = form;

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "units",
  });

  const propertyType = watch("type");
  const numberOfUnits = watch("numberOfUnits");

   useEffect(() => {
    const existingPreview = localStorage.getItem('propertyImagePreview');
    if (existingPreview) {
        setPreviewUrl(existingPreview);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      localStorage.setItem('propertyImagePreview', url);
    }
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          try {
              const units = result.data.map((row: any): Partial<Unit> => ({
                unitNumber: row.unitNumber || '',
                size: row.size || '',
                rent: parseFloat(row.rent) || 0,
                isOccupied: row.isOccupied ? row.isOccupied.toLowerCase() === 'true' : false,
              }));
              replace(units as any);
              setValue("numberOfUnits", units.length);
              toast({
                title: "CSV Parsed!",
                description: `${units.length} units have been loaded from the file.`
              })
          } catch (error) {
              toast({
                  title: "CSV Parsing Error",
                  description: "Could not parse CSV. Make sure it has headers: unitNumber, size, rent, isOccupied.",
                  variant: "destructive"
              });
          }
        },
        error: (error) => {
            toast({
                title: "CSV Error",
                description: error.message,
                variant: "destructive"
            });
        }
      });
    }
  };


  const handleUnitGeneration = (num: number) => {
    if (isNaN(num) || num < 1) {
      replace([]);
      return;
    }
    const newUnits = Array.from({ length: num }, (_, i) => ({
      unitNumber: `Unit ${i + 1}`,
      size: "2 Bedroom",
      rent: 25000,
      isOccupied: false,
    }));
    replace(newUnits);
  };

  const handlePropertyTypeChange = (type: 'Apartment' | 'House' | 'Bedsitter') => {
    setValue("type", type);
    if (type === 'Apartment') {
      setValue("numberOfUnits", 1);
      handleUnitGeneration(1);
    } else if (type === 'House' || type === 'Bedsitter') {
      setValue("numberOfUnits", 1);
      const newUnits = [{
        unitNumber: 'Main Unit',
        size: type === 'House' ? '4 Bedroom' : 'Standard Bedsitter',
        rent: type === 'House' ? 120000 : 15000,
        isOccupied: false,
      }];
      replace(newUnits);
    } else {
      replace([]);
    }
  };

  const onSubmit = async (data: PropertyFormValues) => {
    console.log("Frontend: Submitting property data from onboarding...", data);
    setLoading(true);
    
    if (!imageFile && !previewUrl) {
        toast({
            title: "Image required",
            description: "Please select an image for the property.",
            variant: "destructive"
        });
        setLoading(false);
        return;
    }
    
    if (previewUrl && !imageFile) {
       toast({
            title: "Please re-select image",
            description: "For security, you need to re-select your image to continue.",
            variant: "destructive"
        });
        setLoading(false);
        return;
    }

    try {
      console.log("Frontend: Starting image upload via API (Onboarding)...");
      const formData = new FormData();
      const propertyData = { ...data };

      formData.append('media', imageFile!);
      formData.append('propertyData', JSON.stringify(propertyData));
      
      setOnboardingData(data); // Save final valid data

      const response = await fetch('/api/properties', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Frontend Error: Upload failed with status", response.status, result);
        const errorDetails = result.details ? Object.values(result.details).flat().join(', ') : result.error;
        throw new Error(errorDetails || 'Upload failed');
      }
      
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
        unitNumber: `Unit ${fields.length + 1}`,
        size: "1 Bedroom",
        rent: 20000,
        isOccupied: false,
    });
    const currentNum = numberOfUnits || 0;
    setValue("numberOfUnits", currentNum + 1);
  };


  return (
    <TooltipProvider>
    <div className="container mx-auto p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-4">
        <Progress value={40} className="w-full" />
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Step 2: Add Your First Property</CardTitle>
                        <CardDescription>Let's start by adding details about one of your properties. Your progress is saved automatically.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="sm:col-span-2">
                                  <Label htmlFor="name">Property Name</Label>
                                  <Input id="name" {...register("name")} placeholder="e.g. Greenview Apartments" />
                                  {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
                              </div>
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
                                <Label htmlFor="currency">Currency</Label>
                                <Controller
                                    name="currency"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger id="currency">
                                            <SelectValue placeholder="Select currency..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="KES">KES</SelectItem>
                                            <SelectItem value="USD">USD</SelectItem>
                                            <SelectItem value="EUR">EUR</SelectItem>
                                        </SelectContent>
                                        </Select>
                                    )}
                                />
                                {errors.currency && <p className="text-sm text-destructive mt-1">{errors.currency.message}</p>}
                               </div>
                               <div className="sm:col-span-2">
                                <div className="flex items-center gap-2">
                                  <Label htmlFor="type">Property Type</Label>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <ul className="list-disc list-inside">
                                        <li><b>Apartment:</b> A building with multiple, separate residential units.</li>
                                        <li><b>House:</b> A single, standalone residential building.</li>
                                        <li><b>Bedsitter:</b> A single-room unit combining bedroom and living area.</li>
                                      </ul>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                                  <Controller
                                      name="type"
                                      control={control}
                                      render={({ field }) => (
                                          <Select onValueChange={(value) => { field.onChange(value); handlePropertyTypeChange(value as any); }} value={field.value}>
                                          <SelectTrigger id="type">
                                              <SelectValue placeholder="Select a type..." />
                                          </SelectTrigger>
                                          <SelectContent>
                                              <SelectItem value="Apartment">Apartment</SelectItem>
                                              <SelectItem value="House">House</SelectItem>
                                              <SelectItem value="Bedsitter">Bedsitter</SelectItem>
                                          </SelectContent>
                                          </Select>
                                      )}
                                  />
                                  {errors.type && <p className="text-sm text-destructive mt-1">{errors.type.message}</p>}
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
                    {propertyType === "Apartment" && (
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                  <CardTitle>Apartment Units</CardTitle>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="max-w-xs">Define the individual residential spaces within the apartment building. Each unit has its own details like rent and type.</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                                <CardDescription>Define the number of units or upload a CSV.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
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
                                    {errors.numberOfUnits && <p className="text-sm text-destructive mt-1">{errors.numberOfUnits.message}</p>}
                                </div>
                                <div className="relative">
                                    <Separator />
                                    <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-card px-2 text-sm text-muted-foreground">OR</span>
                                </div>
                                 <div>
                                    <div className="flex items-center gap-2">
                                      <Label htmlFor="csvFile">Upload Units (CSV)</Label>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="max-w-xs">The CSV file must contain the headers: <br /> `unitNumber`, `size`, `rent`, `isOccupied`.</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input id="csvFile" type="file" accept=".csv" onChange={handleCsvUpload} />
                                        <Button type="button" variant="outline" size="icon" asChild>
                                            <Label htmlFor="csvFile" className="cursor-pointer">
                                                <Upload className="h-4 w-4" />
                                            </Label>
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">Headers: unitNumber, size, rent, isOccupied</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    
                    {(propertyType && fields.length > 0) && <Separator />}

                    <div className="space-y-6">
                        {fields.map((field, index) => (
                          <Card key={field.id} className="p-4">
                            <div className="flex justify-between items-center mb-4">
                              <h4 className="text-lg font-medium">
                                {propertyType === 'Apartment' ? `Unit Details` : 'Unit Details'}
                              </h4>
                              {propertyType === 'Apartment' && (
                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:bg-destructive/10">
                                  <AnimatedDeleteIcon />
                                </Button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                               <div>
                                <Label htmlFor={`units.${index}.unitNumber`}>Unit Number</Label>
                                <Input id={`units.${index}.unitNumber`} {...register(`units.${index}.unitNumber`)} />
                              </div>
                              <div>
                                <Label htmlFor={`units.${index}.size`}>Size/Type</Label>
                                 <Input id={`units.${index}.size`} {...register(`units.${index}.size`)} placeholder="e.g. 2 Bedroom"/>
                              </div>
                              <div>
                                <Label htmlFor={`units.${index}.rent`}>Monthly Rent</Label>
                                <Input id={`units.${index}.rent`} type="number" {...register(`units.${index}.rent`)} />
                              </div>
                              <div className="flex items-center space-x-2 pt-6">
                                   <Controller
                                    name={`units.${index}.isOccupied`}
                                    control={control}
                                    render={({ field }) => (
                                        <Switch
                                            id={`units.${index}.isOccupied`}
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    )}
                                    />
                                  <Label htmlFor={`units.${index}.isOccupied`}>Occupied</Label>
                                </div>
                            </div>
                             <Collapsible className="mt-4">
                                <CollapsibleTrigger asChild>
                                    <Button variant="link" className="p-0 h-auto">
                                        <PlusCircle className="mr-2 h-4 w-4" /> Add Images/Documents
                                    </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="space-y-4 pt-4">
                                     <div>
                                        <Label htmlFor={`unit-gallery-${index}`}>Unit Images</Label>
                                        <Input id={`unit-gallery-${index}`} type="file" multiple accept="image/*" />
                                    </div>
                                    <div>
                                        <Label htmlFor={`unit-docs-${index}`}>Unit Documents</Label>
                                        <Input id={`unit-docs-${index}`} type="file" multiple accept=".pdf,.doc,.docx" />
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                             {errors.units?.[index] && (
                                <div className="text-sm text-destructive mt-2">
                                   {Object.values(errors.units[index]).map((error: any, i) => error.message && <p key={i}>{error.message}</p>)}
                                </div>
                              )}
                          </Card>
                        ))}
                         {propertyType === 'Apartment' && (
                            <Button type="button" variant="outline" onClick={addUnit}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Another Unit
                            </Button>
                        )}
                        {errors.units && typeof errors.units.message === 'string' && <p className="text-sm text-destructive mt-1">{errors.units.message}</p>}
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
    </TooltipProvider>
  );
}
