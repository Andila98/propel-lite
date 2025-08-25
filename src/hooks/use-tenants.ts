
"use client";

import { useState, useEffect } from 'react';
import type { Tenant, Property } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export function useTenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [tenantsRes, propertiesRes] = await Promise.all([
          fetch('/api/tenants'),
          fetch('/api/properties'),
        ]);

        if (!tenantsRes.ok) throw new Error('Failed to fetch tenants.');
        if (!propertiesRes.ok) throw new Error('Failed to fetch properties.');
        
        const tenantsData = await tenantsRes.json();
        const propertiesData = await propertiesRes.json();

        setTenants(tenantsData);
        setProperties(propertiesData);
      } catch (err: any) {
        console.error("Hook Error: Failed to fetch tenant/property data:", err);
        setError(err.message || "An unknown error occurred.");
        toast({
          title: "Error fetching data",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [toast]);

  return { tenants, properties, loading, error };
}
