
"use client";

import { useState, useEffect } from 'react';
import type { Tenant } from '@/lib/types';
import { getTokens } from 'next-firebase-auth-edge';
import { authConfig } from '@/config/server-config';

export function useTenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTenants = async () => {
        try {
            console.log("Hook: useTenants is fetching data from API.");
            const tokens = await getTokens();
            const response = await fetch('/api/tenants', {
              headers: {
                Authorization: `Bearer ${tokens?.idToken}`
              }
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to fetch tenants.');
            }
            const data = await response.json();
            setTenants(data);
            console.log("Hook: Successfully fetched and set tenants.", data.length);
        } catch (err: any) {
            console.error("Hook Error: Failed to fetch tenants from API:", err);
            setError(err.message || "An unknown error occurred.");
        } finally {
            setLoading(false);
        }
    };

    fetchTenants();
  }, []);

  return { tenants, loading, error };
}
