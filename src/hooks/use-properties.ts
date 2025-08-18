
"use client";

import { useState, useEffect } from 'react';
import type { Property } from '@/lib/types';
import { mockProperties, mockUnits } from '@/lib/mock-data';

export function useProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProperties = async () => {
        try {
            console.log("Hook: useProperties is fetching mock data.");
            await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay

            const propertiesWithUnits = mockProperties.map(prop => ({
                ...prop,
                units: mockUnits.filter(unit => unit.propertyId === prop.id)
            })) as Property[];
            
            setProperties(propertiesWithUnits);
            console.log("Hook: Successfully fetched and set mock properties.", propertiesWithUnits.length);
        } catch (err: any) {
            console.error("Hook Error: Failed to fetch mock properties:", err);
            setError(err.message || "An unknown error occurred.");
        } finally {
            setLoading(false);
        }
    };

    fetchProperties();
  }, []);

  return { properties, loading, error };
}
