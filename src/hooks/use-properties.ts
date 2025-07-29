
"use client";

import { useState, useEffect } from 'react';
import { onSnapshot, query, orderBy } from 'firebase/firestore';
import { propertiesCollection } from '@/lib/firebase';
import type { Property } from '@/lib/types';

export function useProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("Hook: useProperties is mounting and fetching data.");
    const q = query(propertiesCollection, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const props: Property[] = [];
        snapshot.forEach((doc) => {
          props.push({ id: doc.id, ...doc.data() } as Property);
        });
        setProperties(props);
        setLoading(false);
        console.log("Hook: Successfully fetched and set properties.", props.length);
      },
      (err) => {
        console.error("Hook Error: Failed to fetch properties from Firestore:", err);
        setError("Failed to connect to the database. Please check your connection and try again.");
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => {
        console.log("Hook: useProperties is unmounting.");
        unsubscribe();
    }
  }, []);

  return { properties, loading, error };
}
