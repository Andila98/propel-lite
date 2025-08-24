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
