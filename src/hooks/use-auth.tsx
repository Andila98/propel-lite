
"use client";

import { 
  useState, 
  useEffect, 
  createContext, 
  useContext, 
  ReactNode, 
  useCallback,
} from 'react';
import { Loader2 } from 'lucide-react';
import { auth } from '@/lib/firebase-client';
import { 
  signOut as firebaseSignOut, 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup,
  type User as FirebaseUser
} from 'firebase/auth';
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
  lastLoginAt?: string;
}

interface AuthError {
  message: string;
  code?: string;
}

type AuthStatus = 'initializing' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextType {
  user: User | null;
  status: AuthStatus;
  error: AuthError | null;
  login: (email: string, pass: string, isSignUp?: boolean) => Promise<void>;
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
  private readonly maxAttempts = 3;
  private readonly delays = [1000, 3000, 5000];

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
      try {
        const result = await operation();
        return result;
      } catch (error: unknown) {
        const typedError = error as { code?: string };
        console.warn(`[Auth] Attempt ${attempt + 1} failed:`, (error as Error).message);

        if (this.shouldNotRetry(typedError)) {
          throw error;
        }

        if (attempt < this.maxAttempts - 1) {
          await this.delay(this.delays[attempt]);
        }
      }
    }

    throw new AuthenticationError(
      'Connection failed after multiple attempts. Please check your internet connection.',
      'CONNECTION_FAILED'
    );
  }

  private shouldNotRetry(error: { code?: string }): boolean {
    const nonRetryableCodes = [
      'auth/invalid-email',
      'auth/user-not-found',
      'auth/wrong-password',
      'auth/invalid-credential',
      'auth/user-disabled',
      'auth/too-many-requests'
    ];
    return nonRetryableCodes.includes(error.code || '');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

async function fetchUserFromApi(): Promise<User | null> {
  try {
    const response = await fetch('/api/auth/me', {
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });

    if (response.status === 401) {
      return null;
    }
    
    if (response.status === 429) {
      throw new AuthenticationError(
        'Too many requests. Please try again in a few minutes.',
        'RATE_LIMIT_EXCEEDED'
      );
    }

    if (response.status === 503) {
      throw new AuthenticationError(
        'Service temporarily unavailable. Please try again later.',
        'SERVICE_UNAVAILABLE'
      );
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Auth] API error:', { status: response.status, error: errorData });
      throw new Error(`Failed to fetch user profile: ${response.status}`);
    }

    const userProfile = await response.json();
    return userProfile;
  } catch (error) {
    console.error('[Auth] fetchUserFromApi failed:', error);
    throw error;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('initializing');
  const [error, setError] = useState<AuthError | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const checkInitialSession = useCallback(async () => {
    setStatus('initializing');
    try {
      const userProfile = await fetchUserFromApi();
      setUser(userProfile);
      setStatus(userProfile ? 'authenticated' : 'unauthenticated');
    } catch (e: unknown) {
      const err = e as Error & { code?: string };
      console.error("[Auth] Initial session check failed:", err.message);
      
      // Only set error for user-facing issues
      if (err instanceof AuthenticationError) {
        setError({ message: err.message, code: err.code });
      }
      
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  useEffect(() => {
    checkInitialSession();
  }, [checkInitialSession]);
  
  const retryConnection = useCallback(async () => {
    await checkInitialSession();
  }, [checkInitialSession]);

  const refreshUser = useCallback(async () => {
    await checkInitialSession();
  }, [checkInitialSession]);

  const processLogin = useCallback(async (idToken: string): Promise<User> => {
    setStatus('loading');
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    const responseBody = await response.json();
    if (!response.ok) {
      setStatus('unauthenticated');
      throw new AuthenticationError(responseBody.error || 'Login failed.', responseBody.code);
    }
    const userProfile = responseBody as User;
    setUser(userProfile);
    setStatus('authenticated');
    return userProfile;
  }, []);

  const login = useCallback(async (email: string, password: string, isSignUp: boolean = false): Promise<void> => {
    clearError();
    setStatus('loading');
    
    const loginAttempt = async () => {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const idToken = await userCredential.user.getIdToken();
        await processLogin(idToken);
    };

    try {
        if (isSignUp) {
            // After signup, there can be a replication delay. We retry a few times.
            const retryHandler = new ConnectionRetry();
            await retryHandler.execute(loginAttempt);
        } else {
            await loginAttempt();
        }
    } catch (error: unknown) {
        const typedError = error as { code?: string };
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
}, [processLogin, clearError]);
  
  const loginWithGoogle = useCallback(async (): Promise<void> => {
    clearError();
    setStatus('loading');
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      const userCredential = await signInWithPopup(auth, provider);
      const idToken = await userCredential.user.getIdToken();
      await processLogin(idToken);

    } catch (error: unknown) {
      const typedError = error as { code?: string };
      const message = 'Google sign-in failed. Please try again.';
      if (typedError.code !== 'auth/cancelled-popup-request') {
        const authError = { message, code: typedError.code };
        setError(authError);
        setStatus('unauthenticated');
        throw new AuthenticationError(message, typedError.code);
      } else {
        setStatus('unauthenticated');
      }
    }
  }, [processLogin, clearError]);

  const logout = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      clearError();
      setUser(null); 
      setStatus('unauthenticated');
    }
  }, [clearError]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      status, 
      error,
      login, 
      loginWithGoogle, 
      logout, 
      refreshUser,
      clearError,
      retryConnection
    }}>
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
