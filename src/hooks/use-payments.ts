

"use client";

import { useState, useEffect } from 'react';
import type { Payment } from '@/lib/types';

// This hook is currently not used but is set up for future use if needed.
// It fetches payments for a specific tenant.
export function usePayments(tenantId: string) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }
    
    const fetchPayments = async () => {
        try {
            setLoading(true);
            console.log(`Hook: usePayments fetching data for tenantId: ${tenantId}`);
            
            const response = await fetch(`/api/tenants/${tenantId}/payments`);
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to fetch payments.');
            }
            const data = await response.json();

            setPayments(data);
            console.log(`Hook: Successfully fetched payments for tenant ${tenantId}`);
        } catch (err: any) {
             console.error(`Hook Error: Failed to fetch payments for tenant ${tenantId}:`, err);
            setError(err.message || "An unknown error occurred.");
        } finally {
            setLoading(false);
        }
    }

    fetchPayments();

  }, [tenantId]);

  return { payments, loading, error };
}
