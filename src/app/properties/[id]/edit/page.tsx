

"use client"

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { PlusCircle, Image as ImageIcon, Loader2, Upload, Info } from 'lucide-react';
import type { Property, Unit } from '@/lib/types';
import { PropertyFormSchema, type PropertyFormValues } from '@/lib/schemas';
import { AnimatedDeleteIcon } from '@/components/icons/animated-delete-icon';
import { AnimatedBackIcon } from '@/components/icons/animated-back-icon';
import { useProperty } from '@/hooks/use-property';
import Papa from 'papaparse';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function EditPropertyPage() {
  const router = useRouter();
  const { id } = useParams();
  const { toast } = useToast();
  const propertyId = id as string;
  const { property: propertyToEdit, loading: propertyLoading } = useProperty(propertyId);
  
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(PropertyFormSchema),
    defaultValues: {
      address: '',
      type: 'Apartment',
      units: [],
      numberOfUnits: 0,
    },
  });

  useEffect(() => {
    if (propertyToEdit) {
      form.reset({
        name: propertyToEdit.name || "",
        address: propertyToEdit.address || "",
        type: propertyToEdit.type,
        description: propertyToEdit.description || "",
        units: (propertyToEdit as any).units || [],
        numberOfUnits: (propertyToEdit as any).units?.length || 0,
      });
      setPreviewUrl(propertyToEdit.imageUrl);
    }
  }, [propertyToEdit, form]);


  const { register, control, handleSubmit, formState: { errors }, setValue, watch } = form;

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "units",
  });

  const propertyType = watch("type");
  const numberOfUnits = watch("numberOfUnits");
  
  if (propertyLoading) {
    return <div>Loading...</div>; 
  }

  if (!propertyToEdit) {
    return <div>Property not found.</div>;
  }

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          try {
              const units = result.data.map((row: any): Unit => ({
                id: row.id || '',
                propertyId: propertyId,
                landlordId: '',
                unitNumber: row.unitNumber || '',
                rent: parseFloat(row.rent) || 0,
                size: row.size || '',
                isOccupied: row.isOccupied ? row.isOccupied.toLowerCase() === 'true' : true,
              }));
              replace(units);
              setValue("numberOfUnits", units.length);
              toast({
                title: "CSV Parsed!",
                description: `${units.length} units have been loaded from the file.`
              })
          } catch (error) {
              toast({
                  title: "CSV Parsing Error",
                  description: "Could not parse CSV. Make sure it has headers: unitNumber, unitType, rent, squareFootage, isAvailable.",
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
    const currentUnits = watch('units') || [];
    const newUnits = Array.from({ length: num }, (_, i) => currentUnits[i] || {
      unitNumber: `Unit ${i + 1}`,
      unitType: "one-bedroom",
      rent: 1000,
      squareFootage: 500,
      isAvailable: true,
    });
    replace(newUnits);
  };

  const handlePropertyTypeChange = (type: string) => {
    setValue("type", type as "Apartment" | "House" | "Bedsitter");
    if (type === 'Apartment') {
      if (!numberOfUnits || numberOfUnits === 0) {
        setValue("numberOfUnits", 1);
        handleUnitGeneration(1);
      }
    } else if (type === 'House' || type === 'Bedsitter') {
      setValue("numberOfUnits", 1);
      const unitTypeMap: { [key: string]: 'three-bedroom' | 'bedsitter' } = {
        'House': 'three-bedroom',
        'Bedsitter': 'bedsitter',
      };
      const newUnits = [{
        unitNumber: 'Main Unit',
        unitType: unitTypeMap[type],
        rent: 1500,
        squareFootage: type === 'House' ? 1200 : 400,
        isAvailable: true,
      }];
      replace(newUnits as any);
    } else {
      replace([]);
    }
  };

  const onSubmit = async (data: PropertyFormValues) => {
    setLoading(true);

    try {
      const response = await fetch(`/api/properties/${propertyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Update failed');
      }

      toast({
        title: "Property Updated!",
        description: "Your property has been successfully saved.",
      });
      router.push(`/properties/${propertyId}`);

    } catch (err: any) {
        console.error("Frontend: Error during property update:", err);
        toast({
            title: "Update Failed",
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
        rent: 1000,
        isOccupied: false
    });
    const currentNum = numberOfUnits || 0;
    setValue("numberOfUnits", currentNum + 1);
  };

  return (
    <TooltipProvider>
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
            <Link href={`/properties/${propertyId}`}>
                <Button variant="outline" size="icon" className="h-8 w-8">
                    <AnimatedBackIcon />
                    <span className="sr-only">Back to Property</span>
                </Button>
            </Link>
            <h2 className="text-3xl font-bold tracking-tight">Edit Property</h2>
        </div>
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 space-y-6">
                    <Card>
                      <CardHeader>
                        <CardDescription>Update the details for your property.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="md:col-span-2">
                                  <Label htmlFor="address">Address</Label>
                                  <Input id="address" {...register("address")} autoComplete="street-address" />
                                  {errors.address && <p className="text-sm text-destructive mt-1">{errors.address.message}</p>}
                              </div>
                              <div>
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
                                          <Select onValueChange={(value) => handlePropertyTypeChange(value)} value={field.value}>
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
                                                    <p className="max-w-xs">The CSV file must contain the headers: <br /> `unitNumber`, `unitType`, `rent`, `squareFootage`, `isAvailable`.</p>
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
                                            <p className="text-xs text-muted-foreground mt-1">Headers: unitNumber, unitType, rent, squareFootage, isAvailable</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                      </CardContent>
                    </Card>

                    <div className="space-y-6">
                        {(propertyType && fields.length > 0) && <Separator />}
                        {fields.map((field, index) => (
                          <div key={field.id} className="space-y-4 rounded-lg border p-4 relative">
                            <div className="flex justify-between items-center">
                              <h4 className="text-lg font-medium">
                                {propertyType === 'Apartment' ? `Unit Details` : 'Unit Details'}
                              </h4>
                              {propertyType === 'Apartment' && (
                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:bg-destructive/10">
                                  <AnimatedDeleteIcon />
                                </Button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                              <div>
                                <Label htmlFor={`units.${index}.unitNumber`}>Unit Number</Label>
                                <Input id={`units.${index}.unitNumber`} {...register(`units.${index}.unitNumber`)} />
                              </div>
                              <div>
                                <Label htmlFor={`units.${index}.size`}>Unit Size/Type</Label>
                                <Input id={`units.${index}.size`} {...register(`units.${index}.size`)} placeholder="e.g. 2 Bedroom" />
                              </div>
                              <div>
                                <Label htmlFor={`units.${index}.rent`}>Monthly Rent (Ksh)</Label>
                                <Input id={`units.${index}.rent`} type="number" {...register(`units.${index}.rent`)} />
                              </div>
                              <div className="flex flex-col justify-center space-y-2 pt-6">
                                <div className="flex items-center space-x-2">
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
                                   {errors.units[index]?.unitNumber && <p>{errors.units[index]?.unitNumber?.message}</p>}
                                   {errors.units[index]?.rent && <p>{errors.units[index]?.rent?.message}</p>}
                                </div>
                              )}
                          </div>
                        ))}
                         {propertyType === 'Apartment' && (
                            <Button type="button" variant="outline" onClick={addUnit}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Another Unit
                            </Button>
                        )}
                    </div>
                </div>
                <div className="lg:col-span-2 space-y-8">
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
                   {loading ? <Loader2 className="animate-spin" /> : "Save Changes"}
                </Button>
            </div>
        </form>
    </div>
    </TooltipProvider>
  );
}
