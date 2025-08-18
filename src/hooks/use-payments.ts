
"use client";

import { useState, useEffect } from 'react';
import type { Payment } from '@/lib/types';
import { mockPayments } from '@/lib/mock-data';

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
            console.log(`Hook: usePayments fetching mock data for tenantId: ${tenantId}`);
            await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
            const data = mockPayments.filter(p => p.tenantId === tenantId);
            setPayments(data);
            console.log(`Hook: Successfully fetched mock payments for tenant ${tenantId}`);
        } catch (err: any) {
            console.error(`Hook Error: Failed to fetch mock payments for tenant ${tenantId}:`, err);
            setError(err.message || "An unknown error occurred.");
        } finally {
            setLoading(false);
        }
    }

    fetchPayments();

  }, [tenantId]);

  return { payments, loading, error };
}
