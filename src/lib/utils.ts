
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

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

    // Handle server-side and client-side Firestore Timestamps by checking for the toDate method
    if (dateValue && typeof dateValue.toDate === 'function') {
        return dateValue.toDate().toISOString();
    }
    
    // Handle objects that might be serialized Timestamps
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
    if (typeof data.toDate === 'function') {
      // It's a Firestore Timestamp
      return data.toDate().toISOString();
    }
    
    const newObj: { [key: string]: any } = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        newObj[key] = toJSON(data[key]);
      }
    }
    return newObj;
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
