
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
  const response = await fetch('/api/auth/me', {
    credentials: 'include',
    headers: {
      'Cache-Control': 'no-cache'
    }
  });

  if (response.status === 401) {
    // The server has confirmed the session is invalid.
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
  const isRedirecting = useRef(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleAuthRedirect = useCallback((currentUser: User | null) => {
    if (isRedirecting.current) return;

    const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/forgot-password');
    const isOnboardingPage = pathname.startsWith('/onboarding');
    const isAcceptInvitePage = pathname.startsWith('/onboarding/accept-invite');
    
    let destination: string | null = null;

    if (currentUser) {
        // Logged-in user logic
        if (!currentUser.profileComplete && currentUser.role !== 'tenant' && !isOnboardingPage) {
            destination = '/onboarding/landlord-welcome';
        } else if (isAuthPage) {
            // If user is on an auth page but is logged in, redirect them away.
            destination = currentUser.role === 'tenant' ? '/tenant-portal' : '/dashboard';
        }
    } else {
        // Logged-out user logic
        if (!isAuthPage && !isAcceptInvitePage) {
            destination = '/login';
        }
    }

    if (destination && destination !== pathname) {
        isRedirecting.current = true;
        router.replace(destination);
        // Reset redirect lock after a short delay
        setTimeout(() => { isRedirecting.current = false; }, 1500);
    }
  }, [pathname, router]);

  const updateUserState = useCallback(async (firebaseUser: FirebaseUser | null) => {
    if (!firebaseUser) {
      if (user !== null) setUser(null); // Clear user state on logout
      setLoading(false);
      handleAuthRedirect(null);
      return;
    }

    // If we already have this user and are not in a loading state, do nothing.
    if (user?.uid === firebaseUser.uid && !loading) {
      handleAuthRedirect(user);
      return;
    }

    try {
      const userProfile = await retryHandler.current.execute(fetchUserFromApi);
      setUser(userProfile);
      setError(null);
      handleAuthRedirect(userProfile);
    } catch (error: unknown) {
      const typedError = error as { message: string, code?: string };
      console.error("[Auth] Error fetching user profile:", typedError);
      setError({
        message: typedError.code === 'CONNECTION_FAILED' 
          ? 'Unable to connect to server. Check connection.' 
          : 'Failed to load user profile.',
        code: typedError.code || 'PROFILE_LOAD_FAILED'
      });
      await firebaseSignOut(auth);
      setUser(null);
      handleAuthRedirect(null);
    } finally {
        setLoading(false);
    }
  }, [handleAuthRedirect, user, loading]);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, updateUserState);
    return () => unsubscribe();
  }, [updateUserState]);
  
  const retryConnection = useCallback(async () => {
    setLoading(true);
    setError(null);
    await updateUserState(auth.currentUser);
    setLoading(false);
  }, [updateUserState]);

  const refreshUser = useCallback(async () => {
    await updateUserState(auth.currentUser);
  }, [updateUserState]);

  const processLogin = useCallback(async (idToken: string): Promise<User> => {
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
      throw new AuthenticationError(responseBody.error || 'Login failed.', responseBody.code);
    }
    return responseBody as User;
  }, []);

  const login = useCallback(async (email: string, password: string, isSignUp: boolean = false): Promise<void> => {
    clearError();
    setLoading(true);
    const loginAttempt = async () => {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const idToken = await userCredential.user.getIdToken();
        const userProfile = await processLogin(idToken);
        setUser(userProfile); // Set user immediately
        handleAuthRedirect(userProfile); // Then redirect
    };

    try {
        if (isSignUp) {
            let attempts = 0;
            const maxAttempts = 3;
            while (attempts < maxAttempts) {
                try {
                    await loginAttempt();
                    return; // Success
                } catch (error: unknown) {
                    const typedError = error as { code?: string };
                    attempts++;
                    if (typedError.code === 'auth/user-not-found' && attempts < maxAttempts) {
                        console.warn(`Login attempt ${attempts} failed due to replication delay. Retrying...`);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    } else {
                        throw error;
                    }
                }
            }
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
        throw new AuthenticationError(message, typedError.code);
    } finally {
        setLoading(false);
    }
}, [processLogin, clearError, handleAuthRedirect]);
  
  const loginWithGoogle = useCallback(async (): Promise<void> => {
    clearError();
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      const userCredential = await signInWithPopup(auth, provider);
      const idToken = await userCredential.user.getIdToken();
      const userProfile = await processLogin(idToken);
      setUser(userProfile);
      handleAuthRedirect(userProfile);

    } catch (error: unknown) {
      const typedError = error as { code?: string };
      const message = 'Google sign-in failed. Please try again.';
      if (typedError.code !== 'auth/cancelled-popup-request') {
        const authError = { message, code: typedError.code };
        setError(authError);
        throw new AuthenticationError(message, typedError.code);
      }
    } finally {
      setLoading(false);
    }
  }, [processLogin, clearError, handleAuthRedirect]);

  const logout = useCallback(async () => {
    try {
      clearError();
      setUser(null); 
      await firebaseSignOut(auth);
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      isRedirecting.current = false;
      router.replace('/login');
    } catch (error) {
      console.error("Error during logout:", error);
    }
  }, [clearError, router]);

  // Initial loading screen for the entire app
  if (loading && user === null) {
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
