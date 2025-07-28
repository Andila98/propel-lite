
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
    if (!propertyId) {
        setLoading(false);
        setError("No property ID provided.");
        return;
    }

    const docRef = doc(db, 'properties', propertyId);

    const unsubscribe = onSnapshot(docRef, 
      (docSnap) => {
        if (docSnap.exists()) {
          setProperty({ id: docSnap.id, ...docSnap.data() } as Property);
        } else {
          setError("Property not found.");
          setProperty(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Failed to fetch property:", err);
        setError("Failed to connect to the database. Please check your connection.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [propertyId]);

  return { property, loading, error };
}
