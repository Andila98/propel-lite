
"use client"

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { AnimatedBackIcon } from '@/components/icons/animated-back-icon';
import { PropertyForm } from '@/components/property-form';
import type { PropertyFormValues } from '@/lib/schemas';
import { useState } from 'react';

export default function AddPropertyPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data: PropertyFormValues, imageFile: File | null) => {
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
      const formData = new FormData();
      formData.append('media', imageFile);
      formData.append('propertyData', JSON.stringify(data));
      
      const response = await fetch('/api/properties', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        const errorDetails = result.details ? Object.values(result.details).flat().join(', ') : result.error;
        throw new Error(errorDetails || 'Upload failed');
      }
      
      toast({
        title: "Property Added!",
        description: "Your property has been successfully saved.",
      });
      router.push('/properties');

    } catch (err: any) {
        toast({
            title: "Upload Failed",
            description: `There was an error saving your property: ${err.message}`,
            variant: "destructive"
        });
    } finally {
        setLoading(false);
    }
  };

  return (
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
        <PropertyForm 
            onSubmit={onSubmit}
            loading={loading}
        />
    </div>
  );
}
