"use client"

import React, { useState, useEffect } from 'react';
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from "@/components/ui/switch";
import { PlusCircle, Image as ImageIcon, Upload, Info, Loader2, XCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { PropertyFormSchema, type PropertyFormValues, UnitSchema } from '@/lib/schemas';
import { AnimatedDeleteIcon } from '@/components/icons/animated-delete-icon';
import Papa from 'papaparse';
import type { Unit } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useFormStatus } from 'react-dom';
import type { FormState } from '@/app/properties/[id]/edit/actions';
import { useRouter } from 'next/navigation';


interface PropertyFormProps {
    formAction: (payload: FormData) => void;
    initialState: FormState;
    initialData?: Partial<PropertyFormValues>;
    isOnboarding?: boolean;
}

function SubmitButton({ isOnboarding }: { isOnboarding?: boolean }) {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" className="w-full md:w-auto" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : (isOnboarding ? "Save & Continue" : "Save Property")}
        </Button>
    )
}

const unitTypes = [
    "Studio",
    "Alcove Studio",
    "Convertible",
    "Bedsitter",
    "Junior 1-Bedroom",
    "1 Bedroom",
    "2 Bedrooms",
    "3 Bedrooms",
    "4+ Bedrooms",
    "Loft",
    "Duplex",
    "Triplex",
    "Penthouse",
    "Townhouse",
    "Garden Apartment"
];


export const PropertyForm = React.memo(function PropertyForm({ formAction, initialState, initialData, isOnboarding = false }: PropertyFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.imageUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  
  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(PropertyFormSchema),
    defaultValues: initialData || {
      name: "",
      address: "",
      description: "",
      currency: "KES",
      type: "Apartment",
      units: [],
    },
  });
  
  const { register, control, formState, setValue, watch, reset } = form;

  // Handle form state changes from the server action
  useEffect(() => {
    if (initialState.success && initialState.propertyId) {
      toast({
        title: isOnboarding ? "Property Added!" : "Property Updated!",
        description: "Your property has been successfully saved.",
      });
      if (isOnboarding) {
        router.push(`/onboarding/add-property-manager?propertyId=${initialState.propertyId}`);
      } else if (initialData?.id) {
        router.push(`/properties/${initialData.id}`);
      } else {
         router.push('/properties');
      }
    }
    if (initialState.error && !initialState.errors) {
       toast({
            title: "Operation Failed",
            description: `There was an error saving your property: ${initialState.error}`,
            variant: "destructive"
        });
    }
  }, [initialState, router, toast, isOnboarding, initialData]);

  useEffect(() => {
    if (initialData) {
      reset(initialData);
      setImagePreview(initialData.imageUrl || null);
    }
  }, [initialData, reset]);

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "units",
  });

  const propertyType = watch("type");
  const numberOfUnits = watch("numberOfUnits");

  const addUnit = () => {
    append({
        unitNumber: `Unit ${fields.length + 1}`,
        rent: 1000,
        size: '1 Bedroom',
        isOccupied: false
    });
    const currentNum = numberOfUnits || 0;
    setValue("numberOfUnits", currentNum + 1);
  };
  
const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        setIsUploading(true);
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const res = await fetch('/api/upload', { 
                method: 'POST', 
                body: formData 
            });
            
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || `Upload failed: ${res.status}`);
            }
            
            const { url } = await res.json();
            
            setValue('imageUrl', url);
            setImagePreview(url);
            toast({ title: 'Success', description: 'Image uploaded successfully.' });
            
        } catch (error: unknown) {
            const typedError = error as Error;
            console.error('[ERROR] Upload failed:', typedError);
            toast({ 
                title: 'Upload Error', 
                description: typedError.message, 
                variant: 'destructive'
            });
        } finally {
            setIsUploading(false);
        }
    }
};

  const removeImage = () => {
      setValue('imageUrl', '');
      setImagePreview(null);
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          const validatedUnits: Unit[] = [];
          let validationError = null;

          for (let i = 0; i < result.data.length; i++) {
            const row: Record<string, unknown> = result.data[i] as Record<string, unknown>;
            const parsedRow = {
              unitNumber: row.unitNumber,
              size: row.size,
              rent: parseFloat(row.rent as string),
              isOccupied: String(row.isOccupied).toLowerCase() === 'true',
            };
            
            const validation = UnitSchema.safeParse(parsedRow);
            if (validation.success) {
              validatedUnits.push(validation.data as Unit);
            } else {
              const firstError = validation.error.errors[0];
              validationError = `Row ${i + 2}: ${firstError.path.join('.')} - ${firstError.message}`;
              break; // Stop on first error
            }
          }

          if (validationError) {
             toast({
                title: "CSV Validation Error",
                description: validationError,
                variant: "destructive",
            });
          } else {
            replace(validatedUnits);
            setValue("numberOfUnits", validatedUnits.length);
            toast({
              title: "CSV Parsed!",
              description: `${validatedUnits.length} units have been successfully loaded and validated.`,
            });
          }
        },
        error: (error) => {
            toast({
                title: "CSV Parsing Error",
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
      size: "2 Bedrooms",
      rent: 25000,
      isOccupied: false,
    }));
    replace(newUnits);
  };

  const handlePropertyTypeChange = (type: 'Apartment' | 'House' | 'Bedsitter') => {
    setValue("type", type);
    if (type === 'Apartment') {
      if (!numberOfUnits || numberOfUnits === 0) {
        setValue("numberOfUnits", 1);
        handleUnitGeneration(1);
      }
    } else if (type === 'House' || type === 'Bedsitter') {
      setValue("numberOfUnits", 1);
      const newUnits = [{
        unitNumber: 'Main Unit',
        size: type === 'House' ? '4+ Bedrooms' : 'Bedsitter',
        rent: type === 'House' ? 120000 : 15000,
        isOccupied: false,
      }];
      replace(newUnits);
    } else {
      replace([]);
    }
  };
  
  const cardHeader = isOnboarding ? (
      <CardHeader>
        <CardTitle>Step 2: Add Your First Property</CardTitle>
        <CardDescription>Let&apos;s start by adding details about one of your properties. You can add more later.</CardDescription>
      </CardHeader>
  ) : (
      <CardHeader>
        <CardTitle>Property Details</CardTitle>
        <CardDescription>Enter the primary information for the property.</CardDescription>
      </CardHeader>
  );

  return (
    <TooltipProvider>
    <form action={formAction}>
         {/* Hidden inputs to pass complex data not supported by native FormData */}
        <input type="hidden" {...register('imageUrl')} />
        <input type="hidden" value={JSON.stringify(watch('units'))} {...register('units')} />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 space-y-6">
                <Card>
                  {cardHeader}
                  <CardContent>
                    <div className="space-y-6">
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="sm:col-span-2">
                              <Label htmlFor="name">Property Name</Label>
                              <Input id="name" {...register("name")} placeholder="e.g. Greenview Apartments" />
                              {initialState?.errors?.name && <p className="text-sm text-destructive mt-1">{initialState.errors.name[0]}</p>}
                          </div>
                          <div className="sm:col-span-2">
                              <Label htmlFor="address">Address</Label>
                              <Input id="address" {...register("address")} autoComplete="street-address" />
                              {initialState?.errors?.address && <p className="text-sm text-destructive mt-1">{initialState.errors.address[0]}</p>}
                          </div>
                            <div>
                            <Label htmlFor="currency">Currency</Label>
                            <Controller
                                name="currency"
                                control={control}
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} defaultValue={field.value} name={field.name}>
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
                            {initialState?.errors?.currency && <p className="text-sm text-destructive mt-1">{initialState.errors.currency[0]}</p>}
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
                                      <Select onValueChange={(value) => handlePropertyTypeChange(value as 'Apartment' | 'House' | 'Bedsitter')} defaultValue={field.value} name={field.name}>
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
                               {initialState?.errors?.type && <p className="text-sm text-destructive mt-1">{initialState.errors.type[0]}</p>}
                          </div>
                        </div>
                        
                        <div>
                            <Label htmlFor="description">Property Description</Label>
                            <Textarea id="description" {...register("description")} placeholder="e.g., A beautiful apartment with stunning views..." />
                             {initialState?.errors?.description && <p className="text-sm text-destructive mt-1">{initialState.errors.description[0]}</p>}
                        </div>
                    </div>
                  </CardContent>
                </Card>

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
                                {initialState?.errors?.numberOfUnits && <p className="text-sm text-destructive mt-1">{initialState.errors.numberOfUnits[0]}</p>}
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
                            {propertyType === 'Apartment' ? `Unit ${index + 1}` : 'Unit Details'}
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
                             {initialState?.errors?.units?.[index]?.unitNumber && <p className="text-sm text-destructive mt-1">{initialState.errors.units[index].unitNumber[0]}</p>}
                          </div>
                          <div>
                                <Label htmlFor={`units.${index}.size`}>Size/Type</Label>
                                <Controller
                                    name={`units.${index}.size`}
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <SelectTrigger id={`units.${index}.size`}>
                                                <SelectValue placeholder="Select unit type..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {unitTypes.map(type => (
                                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {initialState?.errors?.units?.[index]?.size && <p className="text-sm text-destructive mt-1">{initialState.errors.units[index].size[0]}</p>}
                            </div>
                          <div>
                            <Label htmlFor={`units.${index}.rent`}>Monthly Rent</Label>
                            <Input id={`units.${index}.rent`} type="number" {...register(`units.${index}.rent`, { valueAsNumber: true })} />
                            {initialState?.errors?.units?.[index]?.rent && <p className="text-sm text-destructive mt-1">{initialState.errors.units[index].rent[0]}</p>}
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
                      </Card>
                    ))}
                     {propertyType === 'Apartment' && (
                        <Button type="button" variant="outline" onClick={addUnit}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Another Unit
                        </Button>
                    )}
                    {initialState?.errors?.units && typeof initialState.errors.units === 'string' && <p className="text-sm text-destructive mt-1">{initialState.errors.units}</p>}
                </div>
            </div>
            <div className="lg:col-span-2 space-y-6">
                 <Card>
                    <CardHeader>
                        <CardTitle>Property Image</CardTitle>
                        <CardDescription>Upload a main image for the property.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="aspect-video w-full bg-muted rounded-md flex items-center justify-center overflow-hidden relative group">
                            {isUploading && <Loader2 className="h-8 w-8 animate-spin" />}
                            {!isUploading && imagePreview ? (
                                <>
                                    <Image
                                        src={imagePreview}
                                        alt="Property Preview"
                                        width={800}
                                        height={500}
                                        className="object-contain w-full h-full"
                                        data-ai-hint="apartment building"
                                    />
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button size="icon" variant="destructive" type="button" onClick={removeImage}>
                                            <XCircle className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                !isUploading && (
                                    <div className="text-muted-foreground flex flex-col items-center">
                                        <ImageIcon className="h-12 w-12" />
                                        <p>Image preview will appear here</p>
                                    </div>
                                )
                            )}
                        </div>
                        <div className="mt-4">
                             <Label htmlFor="image" className="sr-only">Upload Image</Label>
                             <Input id="image" type="file" accept="image/*" onChange={handleFileChange} disabled={isUploading}/>
                             {initialState?.errors?.imageUrl && <p className="text-sm text-destructive mt-1">{initialState.errors.imageUrl[0]}</p>}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
        <div className="mt-8 flex justify-end">
            <SubmitButton isOnboarding={isOnboarding} />
        </div>
    </form>
    </TooltipProvider>
  );
});
