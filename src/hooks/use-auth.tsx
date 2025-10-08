
"use client";

import { 
  useState, 
  useEffect, 
  createContext, 
  useContext, 
  ReactNode, 
  useCallback,
  useMemo
} from 'react';
import { 
  onAuthStateChanged,
  signOut as firebaseSignOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  GoogleAuthProvider, 
  signInWithPopup,
  fetchSignInMethodsForEmail,
  type User as FirebaseUser
} from 'firebase/auth';
import type { Permission } from '@/lib/types';
import { auth } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';
import { useToast } from './use-toast';

export interface User {
  uid: string;
  email: string;
  name: string;
  role: 'landlord' | 'tenant' | 'admin' | 'manager';
  profileComplete: boolean;
  avatarUrl?: string;
  token?: string;
  permissions?: Record<Permission, boolean>;
  lastLoginAt?: string;
}

interface AuthError {
  message: string;
  code?: string;
}

type AuthStatus = 'initializing' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  status: AuthStatus;
  error: AuthError | null;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
  retryConnection: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

class AuthenticationError extends Error {
  constructor(public message: string, public code?: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

async function fetchWithAuth(url: string, idToken: string, options: RequestInit = {}): Promise<Response> {
    return fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json'
        },
        credentials: 'include'
    });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('initializing');
  const [error, setError] = useState<AuthError | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const clearError = useCallback(() => setError(null), []);

  const handleAuthError = useCallback((err: unknown, defaultMessage: string = 'An unexpected error occurred.') => {
      let message = defaultMessage;
      let code: string | undefined;

      if (err instanceof AuthenticationError) {
          message = err.message;
          code = err.code;
      } else if (err instanceof Error && 'code' in err) {
          const firebaseError = err as { code: string; message: string };
          code = firebaseError.code;
          switch (firebaseError.code) {
              case 'auth/invalid-credential':
              case 'auth/wrong-password':
              case 'auth/user-not-found':
                  message = 'Invalid email or password.';
                  break;
              case 'auth/email-already-in-use':
                  message = 'An account with this email already exists.';
                  break;
              case 'auth/user-disabled':
                  message = 'Your account has been disabled.';
                  break;
              case 'auth/too-many-requests':
                  message = 'Too many failed attempts. Please try again later.';
                  break;
              case 'auth/network-request-failed':
                  message = 'Network error. Please check your connection.';
                  break;
              default:
                  message = firebaseError.message || defaultMessage;
          }
      } else if (err instanceof Error) {
          message = err.message;
      }
      
      const authError = { message, code };
      console.error("[Auth Error]", authError);
      setError(authError);
      setStatus('unauthenticated');
      throw new AuthenticationError(message, code);
  }, []);

  const createServerSession = useCallback(async (fbUser: FirebaseUser) => {
    const idToken = await fbUser.getIdToken(true);
    const response = await fetchWithAuth('/api/auth/login', idToken, { method: 'POST' });
    const responseBody = await response.json();
    
    if (!response.ok) {
      throw new AuthenticationError(responseBody.error || 'Session creation failed.', responseBody.code);
    }
    return responseBody as User;
  }, []);

  const fetchAndSetUser = useCallback(async () => {
    setStatus('loading');
    try {
      const response = await fetch('/api/auth/me', { credentials: 'include' });
      if (response.ok) {
        const userProfile = await response.json();
        setUser(userProfile);
        setStatus('authenticated');
      } else {
        setUser(null);
        setStatus('unauthenticated');
      }
    } catch (e) {
      console.error("Failed to fetch user profile:", e);
      setUser(null);
      setStatus('unauthenticated');
      setError({ message: "Failed to connect to server. Please check your connection." });
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        await fetchAndSetUser();
      } else {
        setUser(null);
        setStatus('unauthenticated');
      }
    }, (err) => {
      console.error("[Auth] onAuthStateChanged error:", err);
      setError({ message: 'Failed to get auth state.', code: 'AUTH_STATE_ERROR' });
      setUser(null);
      setStatus('unauthenticated');
    });

    return () => unsubscribe();
  }, [fetchAndSetUser]);
  
  const retryConnection = useCallback(async () => {
    await fetchAndSetUser();
  }, [fetchAndSetUser]);
  
  const login = useCallback(async (email: string, password: string): Promise<void> => {
    clearError();
    setStatus('loading');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await createServerSession(userCredential.user);
      await fetchAndSetUser();
    } catch (error) {
      handleAuthError(error, 'Login failed.');
    }
  }, [clearError, createServerSession, fetchAndSetUser, handleAuthError]);

  const register = useCallback(async (name: string, email: string, password: string): Promise<void> => {
    clearError();
    setStatus('loading');
    try {
      // 1. Create user on client
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();

      // 2. Create user profile on server
      const response = await fetchWithAuth('/api/auth/signup', idToken, {
        method: 'POST',
        body: JSON.stringify({ displayName: name, email, password })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new AuthenticationError(errorData.error || 'Server-side signup failed.', errorData.code);
      }
      
      // 3. Create server session
      await createServerSession(userCredential.user);
      
      // 4. Finalize state
      await fetchAndSetUser();
      toast({
          title: "Account Created!",
          description: "Logging you in to begin setup...",
      });
    } catch (error) {
      handleAuthError(error, 'Registration failed.');
    }
  }, [clearError, createServerSession, fetchAndSetUser, handleAuthError, toast]);

  const loginWithGoogle = useCallback(async (): Promise<void> => {
    clearError();
    setStatus('loading');
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      await createServerSession(userCredential.user);
      await fetchAndSetUser();
      
      toast({
        title: "Sign-In Successful!",
        description: "Welcome!",
      });

    } catch (error: unknown) {
       const typedError = error as { code?: string };
        if (typedError.code === 'auth/popup-closed-by-user' || typedError.code === 'auth/cancelled-popup-request') {
            setStatus('unauthenticated'); // Reset status without showing error
        } else {
            handleAuthError(error, 'Google sign-in failed.');
        }
    }
  }, [clearError, createServerSession, fetchAndSetUser, handleAuthError, toast]);

  const logout = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      clearError();
      setUser(null); 
      setFirebaseUser(null);
      setStatus('unauthenticated');
      router.push('/login');
    }
  }, [clearError, router]);

  const contextValue = useMemo(() => ({ 
    user,
    firebaseUser,
    status, 
    error,
    login,
    register,
    loginWithGoogle, 
    logout, 
    refreshUser: fetchAndSetUser,
    clearError,
    retryConnection
  }), [user, firebaseUser, status, error, login, register, loginWithGoogle, logout, fetchAndSetUser, clearError, retryConnection]);

  return (
    <AuthContext.Provider value={contextValue}>
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
