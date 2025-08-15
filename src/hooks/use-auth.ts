
"use client";

import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, type User as FirebaseUser, Unsubscribe } from 'firebase/auth';
import { auth } from '@/lib/firebase/client-app';
import { Loader2 } from 'lucide-react';

export interface User {
  uid: string;
  email: string;
  name: string;
  role: 'landlord' | 'tenant' | 'admin';
  profileComplete: boolean;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserData = useCallback(async (uid: string) => {
    try {
      console.log(`[AUTH_PROVIDER] Fetching user data for UID: ${uid}`);
      const res = await fetch('/api/auth/me');
      
      if (res.ok) {
        const userData: User = await res.json();
        setUser(userData);
        console.log(`[AUTH_PROVIDER] User data fetched successfully.`);
      } else {
        const errorText = await res.text();
        console.error(`[AUTH_PROVIDER] Failed to fetch user data. Status: ${res.status}. Response: ${errorText}`);
        // If the server says we're unauthorized, clear local user state.
        if (res.status === 401) {
            setUser(null);
        }
        setError(`Failed to fetch user data (Status: ${res.status})`);
      }
    } catch (err: any) {
      console.error('[AUTH_PROVIDER] An unexpected error occurred during fetchUserData:', err);
      setError(`An error occurred while fetching user data: ${err.message}`);
    }
  }, []);

  useEffect(() => {
    console.log('[AUTH_PROVIDER] Setting up onAuthStateChanged listener.');
    const unsubscribe: Unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      console.log(`[AUTH_PROVIDER] onAuthStateChanged triggered. Firebase user state:`, fbUser ? `Logged in (UID: ${fbUser.uid})` : 'Logged out');
      setFirebaseUser(fbUser);

      if (fbUser) {
        // User is authenticated with Firebase, now fetch detailed profile from our backend.
        await fetchUserData(fbUser.uid);
      } else {
        // User is not authenticated with Firebase.
        setUser(null);
      }
      
      // We are done with the auth check, stop loading.
      setLoading(false);
    });

    // Cleanup subscription on component unmount
    return () => {
        console.log('[AUTH_PROVIDER] Cleaning up onAuthStateChanged listener.');
        unsubscribe();
    };
  }, [fetchUserData]);

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
