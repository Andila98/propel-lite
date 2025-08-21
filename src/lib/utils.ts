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
    // Check if it's a Firestore Timestamp
    if (typeof dateValue === 'object' && dateValue !== null && 'toDate' in dateValue && typeof dateValue.toDate === 'function') {
        return (dateValue as Timestamp).toDate().toISOString();
    }
    // Check if it's already a valid date string or Date object
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
        return date.toISOString();
    }
    return null;
}
