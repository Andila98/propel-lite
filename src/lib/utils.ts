
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Timestamp } from "firebase-admin/firestore";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely converts a Firestore Timestamp or a string/date representation to an ISO string.
 * @param dateValue - The date value to convert.
 * @returns An ISO string, or null if the input is invalid.
 */
export function toISOString(dateValue: any): string | null {
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

    // Handle server-side Firestore Timestamps
    if (typeof dateValue === 'object' && dateValue !== null && typeof dateValue.toDate === 'function') {
        return (dateValue as Timestamp).toDate().toISOString();
    }

    // Handle client-side Firestore Timestamps (which might just be objects with seconds/nanos)
    if (typeof dateValue === 'object' && 'seconds' in dateValue && 'nanoseconds' in dateValue) {
        return new Date(dateValue.seconds * 1000).toISOString();
    }

    return null;
}

/**
 * Recursively converts Firestore Timestamps within an object to ISO strings.
 * This is useful for preparing data to be sent as JSON to the client.
 * @param data - The data object or array to process.
 * @returns A new object or array with Timestamps converted to strings.
 */
export function toJSON(data: any): any {
  if (!data) return data;

  if (Array.isArray(data)) {
    return data.map(item => toJSON(item));
  }

  if (typeof data === 'object') {
     if (typeof data.toDate === 'function') { // It's a Firestore Timestamp
      return data.toDate().toISOString();
    }
    
    const res: { [key: string]: any } = {};
    for (const key in data) {
      res[key] = toJSON(data[key]);
    }
    return res;
  }

  return data;
}
