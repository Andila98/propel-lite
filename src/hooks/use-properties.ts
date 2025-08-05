
"use client";

import { useState, useEffect } from 'react';
import type { Property } from '@/lib/types';

export function useProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProperties = async () => {
        try {
            console.log("Hook: useProperties is fetching data from API.");
            const response = await fetch('/api/properties');
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch properties.');
            }
            setProperties(data);
            console.log("Hook: Successfully fetched and set properties.", data.length);
        } catch (err: any) {
            console.error("Hook Error: Failed to fetch properties from API:", err);
            setError(err.message || "An unknown error occurred.");
        } finally {
            setLoading(false);
        }
    };

    fetchProperties();
  }, []);

  return { properties, loading, error };
}
