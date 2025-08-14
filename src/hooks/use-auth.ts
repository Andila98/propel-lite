
"use client";

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client-app';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  const login = async (email: string, password: string) => {
    // Step 1: Authenticate with Firebase client-side
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Step 2: Get the ID token from the authenticated user
    const idToken = await userCredential.user.getIdToken();
    
    // Step 3: Send the token to the backend API to create a session
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Pass the response status to the error to handle it below
      const error = new Error(data.error || 'Login failed. Please check your credentials.');
      (error as any).status = response.status;
      throw error;
    }
    
    // Step 4: Handle redirection based on role and profile status
    if (data.role === 'landlord' && !data.profileComplete) {
        router.push('/onboarding/welcome');
    } else if (data.role === 'tenant') {
        router.push('/tenant-portal');
    } else {
        router.push('/');
    }
  }

  const logout = async () => {
      try {
        await auth.signOut();
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
      } catch (error) {
        console.error("Error during logout:", error);
      }
  };

  return { user, loading, login, logout };
}
