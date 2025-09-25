"use client";

import useSWR from 'swr';
import type { PropertyManager } from '@/lib/types';
import { fetcher } from '@/lib/utils';

export function useManagers() {
  const { data, error, isLoading, mutate } = useSWR<PropertyManager[]>('/api/managers', fetcher);

  return {
    managers: data || [],
    loading: isLoading,
    error: error?.info?.error || error?.message,
    refresh: mutate,
  };
}
