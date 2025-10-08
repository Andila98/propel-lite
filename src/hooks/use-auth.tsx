
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

class ConnectionRetry {
  private attempts = 3;
  private delay = 1000;

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (this.attempts > 0) {
        this.attempts--;
        await new Promise(res => setTimeout(res, this.delay));
        console.log(`[Auth] Retrying login... ${this.attempts} attempts left.`);
        return this.execute(fn);
      }
      throw error;
    }
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
  
  const processLogin = useCallback(async (email: string, fn: () => Promise<FirebaseUser>): Promise<void> => {
    clearError();
    setStatus('loading');
    try {
      const fbUser = await fn();
      await createServerSession(fbUser);
      await fetchAndSetUser();
    } catch (error) {
      const typedError = error as { code?: string, message: string };
      if (typedError.code === 'auth/invalid-credential') {
        try {
          const methods = await fetchSignInMethodsForEmail(auth, email);
          if (methods.includes(GoogleAuthProvider.PROVIDER_ID)) {
             handleAuthError(new AuthenticationError('This email is registered with Google. Please use Google Sign-In.', 'auth/google-sign-in-required'), 'Login failed.');
          } else {
             handleAuthError(error, 'Login failed.');
          }
        } catch (fetchError) {
          handleAuthError(error, 'Login failed.');
        }
      } else {
        handleAuthError(error, 'Login failed.');
      }
    }
  }, [clearError, createServerSession, fetchAndSetUser, handleAuthError]);
  
 const login = useCallback(async (email: string, password: string, isSignUp: boolean = false): Promise<void> => {
    clearError();
    setStatus('loading');
    
    console.log('[Auth] Starting login for:', email);
    
    const loginAttempt = async () => {
        try {
          console.log('[Auth] Step 1: Calling Firebase signInWithEmailAndPassword');
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          console.log('[Auth] Step 2: Firebase auth successful, UID:', userCredential.user.uid);
          
          console.log('[Auth] Step 3: Getting ID token...');
          const idToken = await userCredential.user.getIdToken();
          console.log('[Auth] Step 4: Got ID token, length:', idToken.length);
          
          console.log('[Auth] Step 5: Calling /api/auth/login...');
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${idToken}`,
              'Content-Type': 'application/json'
            },
            credentials: 'include'
          });
          
          console.log('[Auth] Step 6: Login API response status:', response.status);
          
          if (!response.ok) {
            const errorBody = await response.json();
            console.error('[Auth] Login API failed:', errorBody);
            throw new AuthenticationError(errorBody.error || 'Login failed', errorBody.code);
          }
          
          const userProfile = await response.json();
          console.log('[Auth] Step 7: Got user profile:', userProfile);
          
          setUser(userProfile);
          setStatus('authenticated');
          console.log('[Auth] Step 8: Login complete! ✅');
          
        } catch (error) {
          console.error('[Auth] Login failed at some step:', error);
          throw error;
        }
    };

    try {
        if (isSignUp) {
            const retryHandler = new ConnectionRetry();
            await retryHandler.execute(loginAttempt);
        } else {
            await loginAttempt();
        }
    } catch (error: unknown) {
        const typedError = error as { code?: string };
        console.error('[Auth] Final error:', error);
        
        let message = 'Login failed. Please try again.';
        if (error instanceof AuthenticationError) {
            message = error.message;
        } else {
            switch (typedError.code) {
                case 'auth/invalid-credential':
                case 'auth/wrong-password':
                case 'auth/user-not-found':
                    message = 'Invalid email or password.';
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
        
        const authError = { message, code: typedError.code };
        setError(authError);
        setStatus('unauthenticated');
        throw new AuthenticationError(message, typedError.code);
    }
}, [clearError]);

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
      
      await login(email, password, true);

      toast({
          title: "Account Created!",
          description: "Logging you in to begin setup...",
      });
    } catch (error) {
      handleAuthError(error, 'Registration failed.');
    }
  }, [clearError, login, handleAuthError, toast]);

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
