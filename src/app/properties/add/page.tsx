
"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { Switch } from "@/components/ui/switch";
import { PlusCircle, Image as ImageIcon, Loader2, Upload, Paperclip, Info } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { PropertyFormSchema, type PropertyFormValues } from '@/lib/schemas';
import { AnimatedDeleteIcon } from '@/components/icons/animated-delete-icon';
import { AnimatedBackIcon } from '@/components/icons/animated-back-icon';
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

  useEffect(() => {
    console.log("Frontend: AddPropertyPage component mounted.");
  }, []);

  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(PropertyFormSchema),
    defaultValues: {
      address: "",
      name: "",
      description: "",
      currency: "KES",
    },
  });

  const { register, control, handleSubmit, formState: { errors }, setValue, watch } = form;

  const propertyType = watch("type");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
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
      console.log("Frontend: Starting property creation via API...");
      const formData = new FormData();
      const propertyData = { ...data }; 

      formData.append('media', imageFile);
      formData.append('propertyData', JSON.stringify(propertyData));

      const response = await fetch('/api/properties', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Frontend Error: Property creation failed with status", response.status, result);
        const errorDetails = result.details ? Object.values(result.details).flat().join(', ') : result.error;
        throw new Error(errorDetails || 'Property creation failed');
      }

      console.log("Frontend: Property created successfully:", result);
      
      toast({
        title: "Property Added!",
        description: "Your property has been successfully saved.",
      });
      router.push('/properties');

    } catch (err: any) {
        console.error("Frontend: Error during property creation:", err);
        toast({
            title: "Creation Failed",
            description: `There was an error saving your property: ${err.message}`,
            variant: "destructive"
        });
    } finally {
        setLoading(false);
    }
  };
  
  return (
    <TooltipProvider>
    <div className="flex-1 space-y-4 p-4 md:p-6">
        <div className="flex items-center gap-4">
            <Link href="/properties">
                <Button variant="outline" size="icon" className="h-8 w-8">
                    <AnimatedBackIcon />
                    <span className="sr-only">Back to Properties</span>
                </Button>
            </Link>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Add New Property</h2>
        </div>
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 space-y-6">
                    <Card>
                      <CardHeader>
                        <CardDescription>Enter details about your new property.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <div>
                              <Label htmlFor="name">Property Name</Label>
                              <Input id="name" {...register("name")} placeholder="e.g. Greenwood Heights" />
                              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
                          </div>
                           <div>
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
                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                                <Label htmlFor="imageFileDesktop">Upload Image</Label>
                                <Input id="imageFileDesktop" type="file" accept="image/*" onChange={handleFileChange} />
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
                <Button type="submit" className="w-full sm:w-auto" disabled={loading || !propertyType}>
                   {loading ? <Loader2 className="animate-spin" /> : "Save Property"}
                </Button>
            </div>
        </form>
    </div>
    </TooltipProvider>
  );
}
