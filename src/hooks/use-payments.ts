

"use client";

import { useState, useEffect } from 'react';
import type { Payment } from '@/lib/types';
import { db } from '@/lib/firebase-admin'; // This should be a client-side import if used on client

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
            
            // NOTE: This uses the admin SDK, which is not suitable for direct client-side use.
            // In a real application, this should be an API call to a secure endpoint.
            // For this project's structure, we'll assume an API endpoint `/api/tenants/${tenantId}/payments` exists.
            
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

    // Mocking the payments fetch since there's no dedicated API endpoint yet.
    // In a real implementation, you would remove this and use the fetchPayments call.
    const getMockPayments = async () => {
        setLoading(true);
        const { mockPayments } = await import('@/lib/mock-data');
        const tenantPayments = mockPayments.filter(p => p.tenantId === tenantId);
        setPayments(tenantPayments);
        setLoading(false);
    }

    // getMockPayments();
    // To use a real endpoint, you would call fetchPayments() here.
    
    // For now, we will assume no direct payment fetching hook is needed on this page
    // as payments are often embedded within the tenant object.
    setLoading(false);


  }, [tenantId]);

  return { payments, loading, error };
}
