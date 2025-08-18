
"use client";

import { useState, useEffect } from 'react';
import type { Tenant } from '@/lib/types';
import { mockTenants } from '@/lib/mock-data';

export function useTenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTenants = async () => {
        try {
            console.log("Hook: useTenants is fetching mock data.");
            await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
            setTenants(mockTenants as Tenant[]);
            console.log("Hook: Successfully fetched and set mock tenants.", mockTenants.length);
        } catch (err: any) {
            console.error("Hook Error: Failed to fetch mock tenants:", err);
            setError(err.message || "An unknown error occurred.");
        } finally {
            setLoading(false);
        }
    };

    fetchTenants();
  }, []);

  return { tenants, loading, error };
}
