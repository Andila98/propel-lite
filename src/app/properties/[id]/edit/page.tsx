"use client"

import { useActionState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { useToast } from '@/hooks/use-toast';
import { AnimatedBackIcon } from '@/components/icons/animated-back-icon';
import { Button } from '@/components/ui/button';
import { PropertyForm } from '@/components/property-form';
import { updatePropertyAction } from './actions';
import type { FormState } from './actions';
import { Skeleton } from '@/components/ui/skeleton';
import { PropertyFormValues } from '@/lib/schemas';
import type { Property } from '@/lib/types';
import { fetcher } from '@/lib/utils';


export default function EditPropertyPage() {
  const router = useRouter();
  const { id } = useParams();
  const { toast } = useToast();
  const propertyId = id as string;

  const { data: property, error, isLoading: propertyLoading } = useSWR<Property>(`/api/properties/${propertyId}`, fetcher);
  
  const initialState: FormState = { error: undefined, errors: undefined, success: false };
  const updateActionWithId = updatePropertyAction.bind(null, propertyId);
  const [state, formAction] = useActionState(updateActionWithId, initialState);
  
  React.useEffect(() => {
    if (state.success) {
      toast({
        title: "Property Updated!",
        description: "Your property has been successfully saved.",
      });
      router.push(`/properties/${propertyId}`);
    }
    if (state.error && !state.errors) {
       toast({
            title: "Update Failed",
            description: `There was an error saving your property: ${state.error}`,
            variant: "destructive"
        });
    }
  }, [state, router, toast, propertyId]);
  
  if (propertyLoading) {
    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center gap-4">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-48" />
            </div>
             <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 space-y-6">
                    <Skeleton className="h-96" />
                    <Skeleton className="h-64" />
                </div>
                <div className="lg:col-span-2 space-y-8">
                    <Skeleton className="h-64" />
                </div>
            </div>
        </div>
    )
  }

  if (error || !property) {
    return <div>Property not found or failed to load.</div>;
  }

  const initialData: PropertyFormValues = {
      ...property,
      units: property.units || [],
      numberOfUnits: property.units?.length || 0,
  };

  return (
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
        <PropertyForm 
            formAction={formAction}
            initialState={state}
            initialData={initialData}
        />
    </div>
  );
}
