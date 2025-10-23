
"use client";

import {
  useState,
  useEffect,
  createContext,
  useContext,
  useCallback,
  useMemo,
} from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  fetchSignInMethodsForEmail,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import type { User } from '@/lib/types';
import { useToast } from './use-toast';

// Custom Error for Authentication
class AuthenticationError extends Error {
  code: string;
  constructor(message: string, code: string = 'AUTH_ERROR') {
    super(message);
    this.name = 'AuthenticationError';
    this.code = code;
  }
}

interface AuthContextType {
  user: User | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  error: { message: string; code?: string } | null;
  login: (email: string, password: string) => Promise<void>;
  googleLogin: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const { toast } = useToast();

  const clearError = useCallback(() => setError(null), []);

  const fetchUserProfile = useCallback(async (token: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch user profile');
      const profile: User = await res.json();
      setUser(profile);
      setStatus('authenticated');
      return profile;
    } catch (e) {
      console.error("Failed to fetch user profile, logging out.", e);
      await signOut(auth); // Firebase sign out
      setUser(null);
      setStatus('unauthenticated');
      return null;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
      const token = await firebaseUser.getIdToken(true);
      await fetchUserProfile(token);
    }
  }, [fetchUserProfile]);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setStatus('loading');
        const token = await firebaseUser.getIdToken();
        await fetchUserProfile(token);
      } else {
        setUser(null);
        setStatus('unauthenticated');
      }
    });
    return () => unsubscribe();
  }, [fetchUserProfile]);


  const createSessionCookie = useCallback(async (idToken: string): Promise<User> => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (!response.ok) {
      const errorBody = await response.json();
      throw new AuthenticationError(errorBody.error, errorBody.code);
    }
    return response.json();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    clearError();
    setStatus('loading');

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const idToken = await userCredential.user.getIdToken();
        const userProfile = await createSessionCookie(idToken);
        setUser(userProfile);
        setStatus('authenticated');
    } catch (error: unknown) {
        console.error('[Auth] Login failed:', error);
        
        let message = 'Login failed. Please try again.';
        let code = 'UNKNOWN_ERROR';
        
        const typedError = error as { code?: string };
        if (error instanceof AuthenticationError) {
          message = error.message;
          code = error.code;
        } else if (typedError.code) {
            code = typedError.code;
            switch (code) {
                case 'auth/invalid-credential':
                case 'auth/wrong-password':
                case 'auth/user-not-found':
                    try {
                        const providers = await fetchSignInMethodsForEmail(auth, email);
                        if (providers.includes(GoogleAuthProvider.PROVIDER_ID)) {
                            message = "This email is registered with Google. Please use 'Sign in with Google'.";
                            code = 'auth/google-account-exists';
                        } else {
                            message = 'Invalid email or password.';
                        }
                    } catch (fetchError) {
                        message = 'Invalid email or password.';
                    }
                    break;
                case 'auth/user-disabled':
                    message = 'Your account has been disabled.';
                    break;
                case 'auth/too-many-requests':
                    message = 'Too many failed attempts. Please try again.';
                    break;
                default:
                    message = 'An unexpected error occurred during login.';
            }
        }
        
        const authError = { message, code };
        setError(authError);
        setStatus('unauthenticated');
        toast({ title: 'Login Failed', description: message, variant: 'destructive' });
        throw new AuthenticationError(message, code);
    }
}, [clearError, createSessionCookie, toast]);


  const googleLogin = useCallback(async (): Promise<void> => {
    clearError();
    setStatus('loading');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      const userProfile = await createSessionCookie(idToken);

      setUser(userProfile);
      setStatus('authenticated');
    } catch (error) {
      const typedError = error as { code: string; message: string };
      setError({ message: typedError.message, code: typedError.code });
      setStatus('unauthenticated');
      throw error;
    }
  }, [clearError, createSessionCookie]);


  const register = useCallback(async (name: string, email: string, password: string): Promise<void> => {
    clearError();
    setStatus('loading');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // This automatically signs the user in, so the onAuthStateChanged listener will fire.
      // We'll create the user profile on the backend via a separate API call if needed,
      // or rely on the auth trigger. For simplicity, we can call a signup endpoint.
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await userCredential.user.getIdToken()}` },
        body: JSON.stringify({ name, email }),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        throw new AuthenticationError(errorBody.error || 'Registration failed', errorBody.code);
      }
      
      await createSessionCookie(await userCredential.user.getIdToken());
      // The onAuthStateChanged listener will handle the rest.

    } catch (error: unknown) {
      console.error('[Auth] Registration failed:', error);
      const typedError = error as { message: string, code?: string };
      const authError = { message: typedError.message, code: typedError.code || 'SIGNUP_FAILED' };
      setError(authError);
      setStatus('unauthenticated');
      toast({ title: 'Registration Failed', description: authError.message, variant: 'destructive' });
      throw new AuthenticationError(authError.message, authError.code);
    }
  }, [clearError, createSessionCookie, toast]);

  const logout = useCallback(async () => {
    try {
      await signOut(auth); // Sign out from Firebase client
      await fetch('/api/auth/logout', { method: 'POST' }); // Invalidate server session
      setUser(null);
      setStatus('unauthenticated');
    } catch (e: unknown) {
      console.error("Logout failed", e);
      // Even if server logout fails, client is logged out, so we proceed.
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  const forgotPassword = useCallback(async (email: string): Promise<void> => {
    clearError();
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      const typedError = error as { code: string; message: string };
      setError({ message: typedError.message, code: typedError.code });
      throw error;
    }
  }, [clearError]);

  const value = useMemo(() => ({
    user,
    status,
    error,
    login,
    googleLogin,
    register,
    logout,
    forgotPassword,
    clearError,
    refreshUser
  }), [user, status, error, login, googleLogin, register, logout, forgotPassword, clearError, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
