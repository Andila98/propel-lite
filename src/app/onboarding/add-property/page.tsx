
"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { PropertyFormSchema, type PropertyFormValues } from '@/lib/schemas';
import { useOnboardingForm } from '@/hooks/use-onboarding-form';
import { PropertyForm } from '@/components/property-form';
import { useFormState } from 'react-dom';
import { createPropertyAction } from '@/app/properties/actions';

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

  const { form: formFromHook, setOnboardingData } = useOnboardingForm<PropertyFormValues>('propertyData', {
    resolver: (data, context, options) => {
        // This is a workaround to allow the hook form to manage state
        // while the server action handles the submission.
        // We do not perform validation here as it's done on the server.
        return { values: data, errors: {} };
    },
    defaultValues: {
      name: "",
      address: "",
      description: "",
      currency: "KES",
      units: [],
    },
  });

  const initialState = { error: undefined, success: false };
  const [state, formAction] = useFormState(createPropertyAction, initialState);

  useEffect(() => {
    if (state.success) {
      toast({
        title: "Property Added!",
        description: "Your property has been successfully saved.",
      });
      // Save the final valid data to local storage before moving on
      setOnboardingData(formFromHook.getValues());
      router.push('/onboarding/add-property-manager');
    }
    if (state.error) {
       toast({
            title: "Upload Failed",
            description: `There was an error saving your property: ${state.error}`,
            variant: "destructive"
        });
    }
  }, [state, router, toast, setOnboardingData, formFromHook]);

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <h1 className="text-3xl font-bold">Onboarding</h1>
         <PropertyForm 
            form={formFromHook}
            formAction={formAction}
            isOnboarding
        />
      </div>
    </div>
  );
}
