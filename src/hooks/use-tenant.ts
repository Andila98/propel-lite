
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
      return;
    }
    
    const fetchTenant = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/tenants/${tenantId}`);
            if(!response.ok) throw new Error("Tenant not found.");
            
            const data = await response.json();
            setTenant(data);
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
