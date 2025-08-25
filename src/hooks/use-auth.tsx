
"use client";

import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase-client';
import { onAuthStateChanged, signOut as firebaseSignOut, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
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
    // This request relies on the session cookie being sent automatically by the browser.
    // No Authorization header is needed for same-origin requests.
    const response = await fetch('/api/auth/me');

    if (response.ok) {
        const userProfile = await response.json();
        return userProfile;
    }
    
    if (response.status === 401) {
        // If the session is invalid, sign out the user from the client.
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
            await firebaseUser.getIdToken(true); // Refreshes the token if needed
            const userProfile = await fetchUserFromApi();
            setUser(userProfile);
        } catch (error) {
            console.error("Error refreshing user session:", error);
            setUser(null);
            await logout();
        } finally {
            setLoading(false);
        }
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        setLoading(true);
        if (firebaseUser) {
            try {
                const userProfile = await fetchUserFromApi();
                setUser(userProfile);
            } catch (error) {
                console.error("Error fetching user session:", error);
                setUser(null);
            }
        } else {
            setUser(null);
        }
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const processLogin = useCallback(async (idToken: string): Promise<{ user: User }> => {
    const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${idToken}`,
        },
    });

    if (!response.ok) {
        const errorData = await response.json();
        await firebaseSignOut(auth);
        throw new Error(errorData.error || 'Login failed.');
    }

    const userProfile = await response.json();
    setUser(userProfile);
    return { user: userProfile };
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
