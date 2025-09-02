
"use client";

import { useState, useEffect } from 'react';
import type { PropertyManager } from '@/lib/types';
import { useToast } from './use-toast';

export function useManagers() {
  const [managers, setManagers] = useState<PropertyManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchManagers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/managers');
      if (!response.ok) {
        throw new Error('Failed to fetch property managers.');
      }
      const data = await response.json();
      setManagers(data);
    } catch (err: any) {
      const errorMessage = err.message || "An unknown error occurred.";
      console.error("Hook Error: Failed to fetch managers:", err);
      setError(errorMessage);
      toast({
        title: "Error fetching managers",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManagers();
  }, []);

  return { managers, loading, error, refresh: fetchManagers };
}
