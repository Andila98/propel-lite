
"use client";

import { useState, useEffect } from 'react';
import type { Payment } from '@/lib/types';

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
            const response = await fetch(`/api/tenants/${tenantId}/payments`);
            if (!response.ok) throw new Error("Failed to fetch payment history.");
            const data = await response.json();
            setPayments(data);
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
