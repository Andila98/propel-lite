
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
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth as firebaseAuth } from '@/lib/firebase/client';
import type { User } from '@/lib/types';

// Custom Error for Authentication
class AuthenticationError extends Error {
  code: string;
  constructor(message: string, code: string = 'AUTH_ERROR') {
    super(message);
    this.name = 'AuthenticationError';
    this.code = code;
  }
}

// Simple in-memory retry handler for sign-ups
class ConnectionRetry {
  private attempts = 0;
  async execute(fn: () => Promise<void>) {
    try {
      await fn();
    } catch (error) {
      if (this.attempts < 2) {
        this.attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000 * this.attempts));
        await this.execute(fn);
      } else {
        throw error;
      }
    }
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
      await signOut(firebaseAuth); // Firebase sign out
      setUser(null);
      setStatus('unauthenticated');
      return null;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const firebaseUser = firebaseAuth.currentUser;
    if (firebaseUser) {
      const token = await firebaseUser.getIdToken(true);
      await fetchUserProfile(token);
    }
  }, [fetchUserProfile]);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (firebaseUser) {
        setStatus('loading');
        const token = await firebaseUser.getIdToken();
        const userProfile = await fetchUserProfile(token);
        if(userProfile && userProfile.profileComplete === false){
          window.location.href = '/onboarding/landlord-welcome';
        }
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
        const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
        const idToken = await userCredential.user.getIdToken();
        const userProfile = await createSessionCookie(idToken);
        setUser(userProfile);
        setStatus('authenticated');
        if (userProfile.profileComplete === false) {
          window.location.href = '/onboarding/landlord-welcome';
        }
    } catch (error: unknown) {
        console.error('[Auth] Login failed:', error);
        
        let message = 'Login failed. Please try again.';
        let code = 'UNKNOWN_ERROR';
        
        if (error instanceof AuthenticationError) {
            message = error.message;
            code = error.code;
        } else {
            const typedError = error as { code?: string };
            code = typedError.code || 'UNKNOWN_ERROR';
            switch (code) {
                case 'auth/invalid-credential':
                case 'auth/wrong-password':
                case 'auth/user-not-found':
                    try {
                        const providers = await fetchSignInMethodsForEmail(firebaseAuth, email);
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
                    message = 'Too many failed attempts. Please wait before trying again.';
                    break;
                default:
                    message = 'An unexpected error occurred during login.';
            }
        }
        
        const authError = { message, code };
        setError(authError);
        setStatus('unauthenticated');
        throw new AuthenticationError(message, code);
    }
}, [clearError, createSessionCookie]);


  const googleLogin = useCallback(async (): Promise<void> => {
    clearError();
    setStatus('loading');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(firebaseAuth, provider);
      const idToken = await result.user.getIdToken();
      const userProfile = await createSessionCookie(idToken);

      setUser(userProfile);
      setStatus('authenticated');
      if (userProfile.profileComplete === false) {
        window.location.href = '/onboarding/landlord-welcome';
      }
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
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        throw new AuthenticationError(errorBody.error || 'Registration failed', errorBody.code);
      }
      
      // After successful registration, log the user in to create the session
      await login(email, password);

    } catch (error: unknown) {
      console.error('[Auth] Registration failed:', error);
      const typedError = error as { message: string, code?: string };
      const authError = { message: typedError.message, code: typedError.code };
      setError(authError);
      setStatus('unauthenticated');
      throw new AuthenticationError(typedError.message, typedError.code);
    }
  }, [clearError, login]);

  const logout = useCallback(async () => {
    try {
      await signOut(firebaseAuth); // Sign out from Firebase client
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
      await sendPasswordResetEmail(firebaseAuth, email);
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
