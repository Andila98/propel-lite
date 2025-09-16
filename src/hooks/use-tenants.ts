
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
  meta?: {
    totalProperties: number;
    totalUnits: number;
    occupiedUnits: number;
    occupancyRate: number;
  };
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
      
      console.log('[useTenants] Fetching tenants and properties...');
      
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

      const tenantsData: TenantsResponse | Tenant[] = await tenantsRes.json();
      const propertiesData: PropertiesResponse | Property[] = await propertiesRes.json();

      console.log('[useTenants] Data received:', { 
        tenants: tenantsData, 
        properties: propertiesData 
      });

      // Handle tenants data (support both old and new formats)
      if (Array.isArray(tenantsData)) {
        // Old format - just array of tenants
        setTenants(tenantsData);
        setTenantsMeta({
          totalTenants: tenantsData.length,
          activeTenants: tenantsData.filter(t => t.rentStatus === 'Paid' || t.rentStatus === 'Advance').length,
          overdueTenants: tenantsData.filter(t => t.rentStatus === 'Overdue').length,
          occupancyRate: 0
        });
      } else {
        // New format - with metadata
        setTenants(tenantsData.tenants || []);
        setTenantsMeta(tenantsData.meta || null);
      }

      // Handle properties data (support both old and new formats)
      if (Array.isArray(propertiesData)) {
        // Old format - just array of properties
        setProperties(propertiesData);
      } else {
        // New format - with metadata
        setProperties((propertiesData as PropertiesResponse).properties || []);
      }

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

// Individual tenant hook
export function useTenant(tenantId: string) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenant = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log(`[useTenant] Fetching tenant: ${tenantId}`);
      
      const response = await fetch(`/api/tenants/${tenantId}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[useTenant] API error:`, response.status, errorText);
        throw new Error(`Tenant not found (${response.status})`);
      }

      const data = await response.json();
      console.log(`[useTenant] Tenant data received:`, data);
      
      setTenant(data);
      
    } catch (err: any) {
      console.error(`[useTenant] Error fetching tenant ${tenantId}:`, err);
      setError(err.message || "An unknown error occurred.");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchTenant();
  }, [fetchTenant]);

  return { tenant, loading, error, refresh: fetchTenant };
}
