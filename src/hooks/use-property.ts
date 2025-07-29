
"use client";

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Property } from '@/lib/types';

export function useProperty(propertyId: string) {
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log(`Hook: useProperty mounting for propertyId: ${propertyId}`);
    if (!propertyId) {
        setLoading(false);
        setError("No property ID provided.");
        console.warn("Hook Warn: useProperty called without a propertyId.");
        return;
    }

    const docRef = doc(db, 'properties', propertyId);

    const unsubscribe = onSnapshot(docRef, 
      (docSnap) => {
        if (docSnap.exists()) {
          const fetchedProperty = { id: docSnap.id, ...docSnap.data() } as Property;
          setProperty(fetchedProperty);
          console.log(`Hook: Successfully fetched property:`, fetchedProperty);
        } else {
          setError("Property not found.");
          setProperty(null);
          console.warn(`Hook Warn: Property with id ${propertyId} not found.`);
        }
        setLoading(false);
      },
      (err) => {
        console.error(`Hook Error: Failed to fetch property ${propertyId}:`, err);
        setError("Failed to connect to the database. Please check your connection.");
        setLoading(false);
      }
    );

    return () => {
      console.log(`Hook: useProperty unmounting for propertyId: ${propertyId}`);
      unsubscribe();
    }
  }, [propertyId]);

  return { property, loading, error };
}
