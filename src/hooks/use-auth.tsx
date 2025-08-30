
"use client";

import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase-client';
import { onIdTokenChanged, signOut as firebaseSignOut, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import type { Permission } from '@/lib/types';

export interface User {
  uid: string;
  email: string;
  name: string;
  role: 'landlord' | 'tenant' | 'admin' | 'manager';
  profileComplete: boolean;
  avatarUrl?: string;
  token?: string;
  permissions?: Record<Permission, boolean>;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<{ user: User }>;
  loginWithGoogle: () => Promise<{ user: User }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchUserFromApi(): Promise<User | null> {
    const response = await fetch('/api/auth/me');

    if (response.ok) {
        const userProfile = await response.json();
        return userProfile;
    }
    
    if (response.status === 401) {
        // This is a specific check to handle cases where the server session is invalid.
        // We sign out the client to keep the state consistent.
        await firebaseSignOut(auth);
    }

    return null;
}


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
        setLoading(true);
        try {
            await firebaseUser.getIdToken(true);
            const userProfile = await fetchUserFromApi();
            setUser(userProfile);
        } catch (error) {
            console.error("Error refreshing user session:", error);
            setUser(null);
            await firebaseSignOut(auth);
        } finally {
            setLoading(false);
        }
    }
  }, []);

  const logout = useCallback(async () => {
    await firebaseSignOut(auth);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch(error) {
        console.error("Error during server-side logout:", error);
    }
    setUser(null);
    router.push('/login');
  }, [router]);


  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        try {
          const userProfile = await fetchUserFromApi();
          setUser(userProfile);
        } catch (error) {
          console.error("Error during token refresh or user fetch:", error);
          await logout();
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processLogin = useCallback(async (idToken: string): Promise<{ user: User }> => {
    const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${idToken}`,
        },
    });
    
    const responseBody = await response.json();

    if (!response.ok) {
      // If the profile is incomplete, the server returns a specific error.
      // We must log the user out from the client as well.
      const error: any = new Error(responseBody.error || 'Login failed.');
      error.errorCode = responseBody.errorCode;
      throw error;
    }

    setUser(responseBody);
    return { user: responseBody };
  }, []);

  const login = useCallback(async (email: string, pass: string): Promise<{ user:User }> => {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    const idToken = await userCredential.user.getIdToken();
    return processLogin(idToken);
  }, [processLogin]);
  
  const loginWithGoogle = useCallback(async (): Promise<{ user: User }> => {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const idToken = await userCredential.user.getIdToken();
    return processLogin(idToken);
  }, [processLogin]);

  if (loading && !user) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, logout, refreshUser }}>
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
