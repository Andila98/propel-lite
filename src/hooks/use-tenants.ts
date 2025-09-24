
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Tenant, Property } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface TenantsResponse {
  tenants: Tenant[];
  meta: {
    totalTenants: number;
    activeTenants: number;
    overdueTenants: number;
    occupancyRate: number;
  };
}

interface PropertiesResponse {
  properties: Property[];
}

export function useTenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenantsMeta, setTenantsMeta] = useState<TenantsResponse['meta'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [tenantsRes, propertiesRes] = await Promise.all([
        fetch('/api/tenants'),
        fetch('/api/properties'),
      ]);

      // Handle tenants response
      if (!tenantsRes.ok) {
        const errorText = await tenantsRes.text();
        console.error('[useTenants] Tenants API error:', tenantsRes.status, errorText);
        throw new Error(`Failed to fetch tenants (${tenantsRes.status})`);
      }

      // Handle properties response
      if (!propertiesRes.ok) {
        const errorText = await propertiesRes.text();
        console.error('[useTenants] Properties API error:', propertiesRes.status, errorText);
        throw new Error(`Failed to fetch properties (${propertiesRes.status})`);
      }

      const tenantsData: TenantsResponse = await tenantsRes.json();
      const propertiesData: PropertiesResponse = await propertiesRes.json();

      setTenants(tenantsData.tenants || []);
      setTenantsMeta(tenantsData.meta || null);
      setProperties(propertiesData.properties || []);

    } catch (err: any) {
      console.error("[useTenants] Error fetching data:", err);
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
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { 
    tenants, 
    properties, 
    tenantsMeta,
    loading, 
    error, 
    refresh: fetchData 
  };
}
