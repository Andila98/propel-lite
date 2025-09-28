import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Timestamp } from "firebase-admin/firestore";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * A simple fetcher function for SWR that handles JSON responses and errors.
 * @param url The URL to fetch.
 * @returns The JSON data from the response.
 */
export const fetcher = async (url: string) => {
  const res = await fetch(url);

  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.') as Error & { info?: unknown; status?: number };
    try {
      // Try to parse the error message from the response body
      error.info = await res.json();
    } catch (e: unknown) {
      // If parsing fails, fall back to the status text
      error.info = { error: res.statusText };
    }
    error.status = res.status;
    throw error;
  }

  return res.json();
};

/**
 * Safely converts a Firestore Timestamp or a string/date representation to an ISO string.
 * @param dateValue - The date value to convert.
 * @returns An ISO string, or null if the input is invalid.
 */
export function toISOString(dateValue: unknown): string | null {
    if (!dateValue) return null;
    
    // Handle client-side date objects or ISO strings
    if (dateValue instanceof Date) {
        return dateValue.toISOString();
    }
    if (typeof dateValue === 'string') {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
            return date.toISOString();
        }
    }

    // Handle server-side and client-side Firestore Timestamps by checking for the toDate method
    if (dateValue && typeof (dateValue as { toDate?: () => Date }).toDate === 'function') {
        return (dateValue as { toDate: () => Date }).toDate().toISOString();
    }
    
    // Handle objects that might be serialized Timestamps
    const ts = dateValue as { seconds?: number, nanoseconds?: number };
    if (typeof ts === 'object' && typeof ts.seconds === 'number' && typeof ts.nanoseconds === 'number') {
        return new Date(ts.seconds * 1000).toISOString();
    }

    return null;
}


/**
 * Recursively converts Firestore Timestamps within an object to ISO strings.
 * This is useful for preparing data to be sent as JSON to the client.
 * @param data - The data object or array to process.
 * @returns A new object or array with Timestamps converted to strings.
 */
export function toJSON<T>(data: T): T {
  if (!data) return data;

  if (Array.isArray(data)) {
    return data.map(item => toJSON(item)) as unknown as T;
  }

  const anyData = data as { toDate?: () => Date };
  if (anyData && typeof anyData.toDate === 'function') {
    // It's a Firestore Timestamp
    return anyData.toDate().toISOString() as unknown as T;
  }

  if (typeof data === 'object') {
    const newObj: { [key: string]: unknown } = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        newObj[key] = toJSON((data as Record<string, unknown>)[key]);
      }
    }
    return newObj as T;
  }
  
  return data;
}


/**
 * Formats a number as a currency string.
 * @param amount - The number to format.
 * @param currencyCode - The ISO currency code (e.g., 'KES', 'USD').
 * @returns A formatted currency string.
 */
export const formatCurrency = (amount?: number, currencyCode: string = 'KES') => {
    if (amount === undefined || amount === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

/**
 * Formats a date string into a user-friendly format.
 * @param dateString - The date string to format.
 * @returns A formatted date string (e.g., "January 1, 2024").
 */
export const formatDate = (dateString?: string | Date) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};
