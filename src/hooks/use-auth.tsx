
"use client";

import { 
  useState, 
  useEffect, 
  createContext, 
  useContext, 
  ReactNode, 
  useCallback,
  useRef
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { auth } from '@/lib/firebase-client';
import { 
  onIdTokenChanged, 
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

interface AuthContextType {
  user: User | null;
  loading: boolean;
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
    let lastError: Error;

    for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
      try {
        const result = await operation();
        return result;
      } catch (error: any) {
        lastError = error;
        console.warn(`[Auth] Attempt ${attempt + 1} failed:`, error.message);

        if (this.shouldNotRetry(error)) {
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

  private shouldNotRetry(error: any): boolean {
    const nonRetryableCodes = [
      'auth/invalid-email',
      'auth/user-not-found',
      'auth/wrong-password',
      'auth/invalid-credential',
      'auth/user-disabled',
      'auth/too-many-requests'
    ];
    return nonRetryableCodes.includes(error.code);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

async function fetchUserFromApi(): Promise<User | null> {
  const response = await fetch('/api/auth/me', {
    credentials: 'include',
    headers: {
      'Cache-Control': 'no-cache'
    }
  });

  if (response.status === 401) {
    // The server has confirmed the session is invalid.
    // The onIdTokenChanged listener will handle client-side sign out.
    return null;
  }
  
  if (response.status === 429) {
    throw new AuthenticationError(
      'Too many requests. Please try again in a few minutes.',
      'RATE_LIMIT_EXCEEDED'
    );
  }
  
  if (response.ok) {
    const userProfile = await response.json();
    return userProfile;
  }

  throw new Error(`Failed to fetch user profile: ${response.status}`);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const retryHandler = useRef(new ConnectionRetry());
  const isInitialized = useRef(false);
  const isRedirecting = useRef(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  const handleRedirect = useCallback((currentUser: User | null) => {
    if (!isInitialized.current || isRedirecting.current) {
      return;
    }

    const isOnboardingPage = pathname.startsWith('/onboarding');
    const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/forgot-password');
    let destination: string | null = null;

    if (currentUser) {
      if (!currentUser.profileComplete && currentUser.role !== 'tenant' && !isOnboardingPage) {
        destination = '/onboarding/landlord-welcome';
      } else if (currentUser.profileComplete && (isAuthPage || (isOnboardingPage && pathname !== '/onboarding/complete'))) {
        destination = currentUser.role === 'tenant' ? '/tenant-portal' : '/dashboard';
      }
    } else {
      if (!isAuthPage && !pathname.startsWith('/onboarding/accept-invite')) {
        destination = '/login';
      }
    }
    
    if (destination && destination !== pathname) {
      isRedirecting.current = true;
      router.replace(destination);
      // Reset the flag after a short delay to prevent race conditions
      setTimeout(() => { isRedirecting.current = false; }, 1000);
    }
  }, [pathname, router]);

  const updateUserAndRedirect = useCallback(async (firebaseUser: FirebaseUser | null) => {
    // If no firebaseUser, clear user state and handle redirect for logged-out user.
    if (!firebaseUser) {
      if (user !== null) setUser(null); // Only update state if it changes
      if (!isInitialized.current) {
        isInitialized.current = true;
        setLoading(false);
      }
      handleRedirect(null);
      return;
    }

    // If we already have the correct user, do nothing to prevent loops.
    if (user?.uid === firebaseUser.uid && isInitialized.current) {
      setLoading(false);
      return;
    }

    try {
      const userProfile = await retryHandler.current.execute(fetchUserFromApi);
      setUser(userProfile);
      setError(null);
    } catch (error: any) {
      setError({
        message: error.code === 'CONNECTION_FAILED' 
          ? 'Unable to connect to server. Check connection.' 
          : 'Failed to load user profile.',
        code: error.code || 'PROFILE_LOAD_FAILED'
      });
      await firebaseSignOut(auth);
      setUser(null);
    } finally {
      if (!isInitialized.current) {
        isInitialized.current = true;
      }
      setLoading(false);
      // We get the user profile first, then call handleRedirect with the fresh profile.
      const finalProfile = await fetchUserFromApi().catch(() => null);
      handleRedirect(finalProfile);
    }
  }, [handleRedirect, user]);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, updateUserAndRedirect);
    return () => unsubscribe();
  }, [updateUserAndRedirect]);
  
  const retryConnection = useCallback(async () => {
    setLoading(true);
    setError(null);
    await updateUserAndRedirect(auth.currentUser);
    setLoading(false);
  }, [updateUserAndRedirect]);

  const refreshUser = useCallback(async () => {
    await updateUserAndRedirect(auth.currentUser);
  }, [updateUserAndRedirect]);

  const processLogin = useCallback(async (idToken: string): Promise<void> => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      const responseBody = await response.json();
      throw new AuthenticationError(responseBody.error || 'Login failed.', responseBody.code);
    }
  }, []);

  const login = useCallback(async (email: string, password: string, isSignUp: boolean = false): Promise<void> => {
    clearError();
    const loginAttempt = async () => {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const idToken = await userCredential.user.getIdToken();
        await processLogin(idToken);
    };

    try {
        if (isSignUp) {
            // If it's a signup, retry on "user-not-found" to handle replication delay
            let attempts = 0;
            const maxAttempts = 3;
            while (attempts < maxAttempts) {
                try {
                    await loginAttempt();
                    return; // Success
                } catch (error: any) {
                    attempts++;
                    if (error.code === 'auth/user-not-found' && attempts < maxAttempts) {
                        console.warn(`Login attempt ${attempts} failed due to replication delay. Retrying...`);
                        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retrying
                    } else {
                        throw error; // Re-throw other errors or on final attempt
                    }
                }
            }
        } else {
            await loginAttempt();
        }
    } catch (error: any) {
        let message = 'Login failed. Please try again.';
        if (error instanceof AuthenticationError) {
            message = error.message;
        } else {
            switch (error.code) {
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
        const authError = { message, code: error.code };
        setError(authError);
        throw new AuthenticationError(message, error.code);
    }
}, [processLogin, clearError]);
  
  const loginWithGoogle = useCallback(async (): Promise<void> => {
    clearError();
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      const userCredential = await signInWithPopup(auth, provider);
      const idToken = await userCredential.user.getIdToken();
      await processLogin(idToken);
    } catch (error: any) {
      let message = 'Google sign-in failed. Please try again.';
      if (error.code !== 'auth/cancelled-popup-request') {
        const authError = { message, code: error.code };
        setError(authError);
        throw new AuthenticationError(message, error.code);
      }
    }
  }, [processLogin, clearError]);

  const logout = useCallback(async () => {
    try {
      clearError();
      setUser(null); 
      await firebaseSignOut(auth);
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      isRedirecting.current = false; // Reset redirect lock on logout
      router.replace('/login');
    } catch (error) {
      console.error("Error during logout:", error);
    }
  }, [clearError, router]);

  if (loading || !isInitialized.current) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <div className="text-center">
            <p className="text-lg font-medium">Initializing...</p>
            <p className="text-sm text-muted-foreground">Securing your session</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
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
