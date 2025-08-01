
"use client"

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
import { ArrowLeft, Loader2, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const PropertyManagerFormSchema = z.object({
  name: z.string().min(2, "Please enter a valid name."),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().min(10, "Please enter a valid phone number."),
});
type PropertyManagerFormValues = z.infer<typeof PropertyManagerFormSchema>;

export default function EditPropertyManagerPage() {
  const router = useRouter();
  const { id } = useParams();
  const { toast } = useToast();
  const managerId = id as string;
  const managerToEdit = mockPropertyManagers.find(t => t.id === managerId);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(managerToEdit?.avatarUrl || null);
  const [loading, setLoading] = useState(false);

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
      setPreviewUrl(managerToEdit.avatarUrl);
    }
  }, [managerToEdit, form]);

  if (!managerToEdit) {
    return <div>Manager not found.</div>;
  }

  const { register, handleSubmit, formState: { errors } } = form;
  
  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[1][0]}`;
    }
    return name.substring(0, 2);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const onSubmit = async (data: PropertyManagerFormValues) => {
    setLoading(true);
    let finalAvatarUrl = managerToEdit?.avatarUrl;

    try {
        if (imageFile) {
            console.log("Frontend: Starting manager avatar upload...");
            const formData = new FormData();
            formData.append('media', imageFile);
            // We pass a dummy propertyData object as the API expects it.
            const propertyData = { title: `${data.name}'s Avatar` };
            formData.append('propertyData', JSON.stringify(propertyData));


            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Upload failed');
            }

            const result = await response.json();
            console.log("Frontend: Avatar uploaded successfully. URL:", result.imageUrl);
            finalAvatarUrl = result.imageUrl;
        }

        const updatedManagerData = { ...data, avatarUrl: finalAvatarUrl };
        console.log("Updated Manager data:", updatedManagerData);
        
        toast({
        title: "Manager Updated!",
        description: "The manager's information has been successfully saved.",
        });
        router.push(`/property-managers/${managerId}`);

    } catch (err: any) {
        console.error("Frontend: Error during manager update or avatar upload:", err);
        toast({
            title: "Update Failed",
            description: `There was an error saving the manager: ${err.message}`,
            variant: "destructive"
        });
    } finally {
        setLoading(false);
    }
  };
  
  const avatarImage = previewUrl?.startsWith('http') ? previewUrl : (previewUrl ? `${window.location.origin}${previewUrl}` : null);

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
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Update Manager Information</CardTitle>
                <CardDescription>Modify the details for {managerToEdit.name}.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="flex flex-col items-center gap-4 sm:flex-row">
                        <Avatar className="h-24 w-24">
                            {avatarImage ? (
                                <AvatarImage src={avatarImage} alt={managerToEdit.name} data-ai-hint="person portrait" />
                            ): (
                                <AvatarFallback className="text-3xl">
                                    {getInitials(managerToEdit.name)}
                                </AvatarFallback>
                            )}
                        </Avatar>
                         <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="picture">Profile Picture</Label>
                            <Input id="picture" type="file" accept="image/*" onChange={handleFileChange} />
                        </div>
                    </div>

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
                      <Button type="submit" disabled={loading}>
                        {loading ? <Loader2 className="animate-spin" /> : "Save Changes"}
                      </Button>
                  </div>
                </form>
            </CardContent>
        </Card>
    </div>
  );
}

    

    