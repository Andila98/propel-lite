

"use client";

import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
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
  login: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
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
    
    // If we get a 401, it means the server session is gone, so sign out the client.
    if (response.status === 401) {
        await firebaseSignOut(auth);
    }
    return null;
}


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const handleRedirect = useCallback((user: User | null) => {
    if (!user) return;

    const performRedirect = (path: string) => {
      setTimeout(() => router.push(path), 50);
    }
    
    // If the user is a landlord/manager, their profile is incomplete,
    // and they are NOT already in the onboarding flow, redirect them.
    if (user.role !== 'tenant' && !user.profileComplete && !pathname.startsWith('/onboarding')) {
      performRedirect('/onboarding/landlord-welcome');
    } else {
       const isPublicFlow = pathname.startsWith('/login') || pathname.startsWith('/register');
       if (isPublicFlow) {
        // If they are on a public page but ARE fully set up, redirect them to their portal.
        if (user.role === 'tenant') {
          performRedirect('/tenant-portal');
        } else {
          performRedirect('/dashboard');
        }
      }
    }
  }, [pathname, router]);

  const updateUserAndRedirect = useCallback(async (firebaseUser: import('firebase/auth').User | null) => {
    if (firebaseUser) {
      try {
        const userProfile = await fetchUserFromApi();
        setUser(userProfile);
        handleRedirect(userProfile);
      } catch (error) {
        console.error("Error fetching user profile:", error);
        await firebaseSignOut(auth);
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  }, [handleRedirect]);


  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, updateUserAndRedirect);
    return () => unsubscribe();
  }, [updateUserAndRedirect]);

  const refreshUser = useCallback(async () => {
    setLoading(true);
    await updateUserAndRedirect(auth.currentUser);
    setLoading(false);
  }, [updateUserAndRedirect]);

  const processLogin = useCallback(async (idToken: string): Promise<void> => {
    const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${idToken}`,
        },
    });
    
    const responseBody = await response.json();

    if (!response.ok) {
      // Throw an error that includes the specific error code from the server
      const error: any = new Error(responseBody.error || 'Login failed.');
      error.code = responseBody.errorCode; // Attach the code to the error object
      throw error;
    }

    await refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, pass: string): Promise<void> => {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    const idToken = await userCredential.user.getIdToken();
    await processLogin(idToken);
  }, [processLogin]);
  
  const loginWithGoogle = useCallback(async (): Promise<void> => {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const idToken = await userCredential.user.getIdToken();
    await processLogin(idToken);
  }, [processLogin]);

  const logout = useCallback(async () => {
    // Clear the client-side state immediately.
    setUser(null);
    await firebaseSignOut(auth);
    
    // Then, call the server endpoint to revoke the session cookie and server-side session.
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch(error) {
        console.error("Error during server-side logout:", error);
    } finally {
        // Redirect to login page after both client and server logout attempts.
        router.push('/login');
    }
  }, [router]);

  if (loading) {
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
