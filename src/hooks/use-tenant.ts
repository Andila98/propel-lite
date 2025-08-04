
"use client";

import { useState, useEffect } from 'react';
import type { Tenant } from '@/lib/types';

export function useTenant(tenantId: string) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      setError("No tenant ID provided.");
      return;
    }
    
    const fetchTenant = async () => {
        try {
            console.log(`Hook: useTenant fetching data for tenantId: ${tenantId}`);
            const response = await fetch(`/api/tenants/${tenantId}`);
            if (!response.ok) {
                if(response.status === 404) {
                    throw new Error("Tenant not found.");
                }
                throw new Error('Failed to fetch tenant details.');
            }
            const data = await response.json();
            setTenant(data);
            console.log(`Hook: Successfully fetched tenant:`, data);
        } catch (err: any) {
             console.error(`Hook Error: Failed to fetch tenant ${tenantId}:`, err);
            setError(err.message || "An unknown error occurred.");
        } finally {
            setLoading(false);
        }
    }

    fetchTenant();
  }, [tenantId]);

  return { tenant, loading, error };
}

    