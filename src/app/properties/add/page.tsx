
"use client"

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { AnimatedBackIcon } from '@/components/icons/animated-back-icon';
import { PropertyForm } from '@/components/property-form';
import type { PropertyFormValues } from '@/lib/schemas';
import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { createPropertyAction } from '@/app/properties/actions';

export default function AddPropertyPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const initialState = { error: undefined, success: false };
  const [state, formAction] = useActionState(createPropertyAction, initialState);

  useEffect(() => {
    if (state.success) {
      toast({
        title: "Property Added!",
        description: "Your property has been successfully saved.",
      });
      router.push('/properties');
    }
    if (state.error) {
       toast({
            title: "Upload Failed",
            description: `There was an error saving your property: ${state.error}`,
            variant: "destructive"
        });
    }
  }, [state, router, toast]);

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
        <PropertyForm formAction={formAction} />
    </div>
  );
}
