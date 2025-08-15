
"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { PropertyFormSchema, type PropertyFormValues } from '@/lib/schemas';
import { useOnboardingForm } from '@/hooks/use-onboarding-form';
import { PropertyForm } from '@/components/property-form';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Stepper } from '@/components/ui/stepper';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/use-auth';


const onboardingSteps = [
    { id: 'welcome', label: 'Welcome' },
    { id: 'add-property', label: 'Add Property' },
    { id: 'add-manager', label: 'Add Manager' },
    { id: 'add-tenant', label: 'Add Tenant' },
    { id: 'complete', label: 'Complete' },
];

export default function AddPropertyPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const { firebaseUser } = useAuth();

  const { form: formFromHook, setOnboardingData } = useOnboardingForm<PropertyFormValues>('propertyData', {
    resolver: zodResolver(PropertyFormSchema),
    defaultValues: {
      name: "",
      address: "",
      description: "",
      currency: "KES",
      units: [],
    },
  });

  const onSubmit = async (data: PropertyFormValues, imageFile: File | null) => {
    setLoading(true);
    
    if (!firebaseUser) {
        toast({ title: "Authentication Error", description: "You must be logged in to create a property.", variant: "destructive" });
        setLoading(false);
        return;
    }

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
      const token = await firebaseUser.getIdToken();
      const formData = new FormData();
      formData.append('media', imageFile!);
      formData.append('propertyData', JSON.stringify(data));
      
      setOnboardingData(data); // Save final valid data

      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
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
      router.push('/onboarding/add-property-manager');

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
    <div className="container mx-auto p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <Stepper steps={onboardingSteps} currentStep={1} />
         <PropertyForm 
            form={formFromHook}
            onSubmit={onSubmit}
            loading={loading}
            isOnboarding
        >
             <div className="mt-8">
              <Button type="submit" className="w-full md:w-auto" disabled={loading || !formFromHook.watch('type')}>
                 {loading ? <Loader2 className="animate-spin" /> : "Next: Add Property Manager"}
              </Button>
            </div>
        </PropertyForm>
      </div>
    </div>
  );
}
