
"use client";

import useSWR from 'swr';
import type { Tenant, Property } from '@/lib/types';
import { fetcher } from '@/lib/utils';

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
  const { data: tenantsData, error: tenantsError, isLoading: tenantsLoading, mutate: refreshTenants } = useSWR<TenantsResponse>('/api/tenants', fetcher);
  const { data: propertiesData, error: propertiesError, isLoading: propertiesLoading } = useSWR<PropertiesResponse>('/api/properties', fetcher);
  
  const loading = tenantsLoading || propertiesLoading;
  const error = tenantsError?.info?.error || propertiesError?.info?.error || tenantsError?.message || propertiesError?.message;

  const refresh = () => {
    refreshTenants();
  };

  return { 
    tenants: tenantsData?.tenants || [],
    properties: propertiesData?.properties || [], 
    tenantsMeta: tenantsData?.meta || null,
    loading, 
    error, 
    refresh
  };
}
