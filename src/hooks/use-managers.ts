
"use client";

import { useState, useEffect } from 'react';
import type { PropertyManager } from '@/lib/types';
import { mockPropertyManagers } from '@/lib/mock-data';

export function useManagers() {
  const [managers, setManagers] = useState<PropertyManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchManagers = async () => {
        try {
            // In a real app, you would fetch this from '/api/managers'
            console.log("Hook: useManagers is fetching data.");
            // Simulating an API call
            await new Promise(resolve => setTimeout(resolve, 500));
            setManagers(mockPropertyManagers);
            console.log("Hook: Successfully fetched and set managers.", mockPropertyManagers.length);
        } catch (err: any) {
            console.error("Hook Error: Failed to fetch managers:", err);
            setError(err.message || "An unknown error occurred.");
        } finally {
            setLoading(false);
        }
    };

    fetchManagers();
  }, []);

  return { managers, loading, error };
}

    
