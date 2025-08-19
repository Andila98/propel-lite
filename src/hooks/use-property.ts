
"use client";

import { useState, useEffect } from 'react';
import type { Property, Unit } from '@/lib/types';
import { useToast } from './use-toast';
import type { PropertyFormValues } from '@/lib/schemas';

export function useProperty(propertyId: string) {
  const [property, setProperty] = useState<PropertyFormValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchProperty() {
        if (!propertyId) {
            setLoading(false);
            return;
        };

        setLoading(true);
        try {
            const res = await fetch(`/api/properties/${propertyId}`);
            if (!res.ok) throw new Error("Failed to fetch property");
            const data: Property = await res.json();
            
            // Adapt the fetched data to the form shape
            const formData: PropertyFormValues = {
                ...data,
                units: data.units || [],
                numberOfUnits: data.units?.length || 0,
            };
            setProperty(formData);
        } catch (err: any) {
            setError(err.message);
            toast({ title: "Error", description: "Could not load property details.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }
    fetchProperty();
  }, [propertyId, toast]);

  return { property, loading, error };
}
