
"use client";

import { useState, useEffect } from 'react';
import type { Property } from '@/lib/types';
import { mockProperties, mockUnits } from '@/lib/mock-data';

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
            setLoading(true);
            console.log(`Hook: useProperty fetching mock data for propertyId: ${propertyId}`);
            await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
            const data = mockProperties.find(p => p.id === propertyId);

            if (data) {
                const propertyWithUnits = {
                    ...data,
                    units: mockUnits.filter(u => u.propertyId === propertyId)
                } as Property;
                setProperty(propertyWithUnits);
                console.log(`Hook: Successfully fetched mock property:`, data);
            } else {
                 throw new Error("Property not found.");
            }
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
