
"use client";

import { useState, useEffect } from 'react';
import type { Property } from '@/lib/types';
import { useToast } from './use-toast';

// This hook is now primarily for client-side components that need a list of properties,
// like the tenant creation form. Pages that can be server-rendered should fetch data directly.
export function useProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchProperties() {
      setLoading(true);
      try {
        const res = await fetch('/api/properties');
        if (!res.ok) throw new Error("Failed to fetch properties");
        const data = await res.json();
        setProperties(data);
      } catch (err: any) {
        setError(err.message);
        toast({ title: "Error", description: "Could not load properties.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
    fetchProperties();
  }, [toast]);

  return { properties, loading, error };
}
