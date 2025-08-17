
"use client";

import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, type User as FirebaseUser, Unsubscribe } from 'firebase/auth';
import { auth } from '@/lib/firebase/client-app';
import { Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

export interface User {
  uid: string;
  email: string;
  name: string;
  role: 'landlord' | 'tenant' | 'admin' | 'manager';
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

      if (!res.ok) {
        setUser(null);
        let errorMessage = 'Failed to fetch user session.';
        try {
            const errorData = await res.json();
            errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
            const textError = await res.text();
            console.error('Failed to parse user session error response as JSON. Received:', textError);
            errorMessage = `Failed to fetch user session. Server returned status ${res.status}.`;
        }

        if (res.status !== 401) { // Don't show an error for normal logouts
            setError(errorMessage);
        }
        return;
      }
      
      const userData: User = await res.json();
      setUser(userData);
      console.log(`[AUTH_PROVIDER] User data fetched successfully.`);

    } catch (err: any) {
      console.error('[AUTH_PROVIDER] An unexpected error occurred during fetchUserData:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred while fetching user data.');
      }
    }
  }, []);

  useEffect(() => {
    console.log('[AUTH_PROVIDER] Setting up onAuthStateChanged listener.');
    const unsubscribe: Unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      console.log(`[AUTH_PROVIDER] onAuthStateChanged triggered. Firebase user state:`, fbUser ? `Logged in (UID: ${fbUser.uid})` : 'Logged out');
      setFirebaseUser(fbUser);
      setLoading(true); // Set loading to true while we verify the session on the backend
      setError(null); // Clear previous errors

      if (fbUser) {
        await fetchUserData(fbUser.uid);
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

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
