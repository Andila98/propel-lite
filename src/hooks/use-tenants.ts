
"use client";

import { useState, useEffect } from 'react';
import type { Tenant } from '@/lib/types';

export function useTenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTenants = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/tenants');
            if(!response.ok) throw new Error("Failed to fetch tenants.");

            const data = await response.json();
            setTenants(data);
        } catch (err: any) {
            console.error("Hook Error: Failed to fetch tenants:", err);
            setError(err.message || "An unknown error occurred.");
        } finally {
            setLoading(false);
        }
    };

    fetchTenants();
  }, []);

  return { tenants, loading, error };
}
