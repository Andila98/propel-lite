
"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { PropertyForm } from '@/components/property-form';
import { useFormState } from 'react-dom';
import { createPropertyAction } from '@/app/properties/actions';
import { Stepper } from '@/components/ui/stepper';
import type { FormState } from '@/app/properties/[id]/edit/actions';

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
  
  const initialState: FormState = { error: undefined, errors: undefined, success: false };
  const [state, formAction] = useFormState(createPropertyAction, initialState);

  useEffect(() => {
    if (state.success) {
      toast({
        title: "Property Added!",
        description: "Your property has been successfully saved.",
      });
      router.push('/onboarding/add-property-manager');
    }
    if (state.error && !state.errors) {
       toast({
            title: "Upload Failed",
            description: `There was an error saving your property: ${state.error}`,
            variant: "destructive"
        });
    }
  }, [state, router, toast]);

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <Stepper steps={onboardingSteps} currentStep={1} />
        <PropertyForm 
            formAction={formAction}
            initialState={state}
            isOnboarding
        />
      </div>
    </div>
  );
}
