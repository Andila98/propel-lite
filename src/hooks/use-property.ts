
"use client";

import { useState, useEffect } from 'react';
import type { Property } from '@/lib/types';

export function useProperty(propertyId: string) {
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!propertyId) {
      setLoading(false);
      setError("No property ID provided.");
      return;
    }
    
    const fetchProperty = async () => {
        try {
            console.log(`Hook: useProperty fetching data for propertyId: ${propertyId}`);
            const response = await fetch(`/api/properties/${propertyId}`);
            if (!response.ok) {
                if(response.status === 404) {
                    throw new Error("Property not found.");
                }
                throw new Error('Failed to fetch property details.');
            }
            const data = await response.json();
            setProperty(data);
            console.log(`Hook: Successfully fetched property:`, data);
        } catch (err: any) {
             console.error(`Hook Error: Failed to fetch property ${propertyId}:`, err);
            setError(err.message || "An unknown error occurred.");
        } finally {
            setLoading(false);
        }
    }

    fetchProperty();
  }, [propertyId]);

  return { property, loading, error };
}
