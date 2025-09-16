
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

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [tenantsRes, propertiesRes] = await Promise.all([
        fetch('/api/tenants'),
        fetch('/api/properties'),
      ]);

      if (!tenantsRes.ok) throw new Error('Failed to fetch tenants.');
      if (!propertiesRes.ok) throw new Error('Failed to fetch properties.');
      
      const tenantsResponse = await tenantsRes.json();
      const propertiesData = await propertiesRes.json();

      setTenants(tenantsResponse.tenants || []);
      setProperties(propertiesData || []);
      
    } catch (err: any) {
      console.error("Hook Error: Failed to fetch tenant/property data:", err);
      const errorMessage = err.message || "An unknown error occurred while fetching data.";
      setError(errorMessage);
      toast({
        title: "Error fetching data",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []); // Note: toast is a stable function and doesn't need to be in the dependency array

  return { tenants, properties, loading, error, refresh: fetchData };
}
