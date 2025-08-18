
"use client";

import { useState, useEffect } from 'react';
import type { Tenant } from '@/lib/types';
import { mockTenants } from '@/lib/mock-data';

export function useTenant(tenantId: string) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }
    
    const fetchTenant = async () => {
        try {
            setLoading(true);
            console.log(`Hook: useTenant fetching mock data for tenantId: ${tenantId}`);
            await new Promise(resolve => setTimeout(resolve, 300));
            const data = mockTenants.find(t => t.id === tenantId);

            if (data) {
                setTenant(data as Tenant);
                console.log(`Hook: Successfully fetched mock tenant:`, data);
            } else {
                 throw new Error("Tenant not found.");
            }
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
