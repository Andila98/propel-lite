
"use client";

import { useState, useEffect } from 'react';
import type { PropertyManager } from '@/lib/types';

export function useManagers() {
  const [managers, setManagers] = useState<PropertyManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchManagers = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/managers');
            if (!response.ok) {
                throw new Error('Failed to fetch property managers.');
            }
            const data = await response.json();
            setManagers(data);
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
