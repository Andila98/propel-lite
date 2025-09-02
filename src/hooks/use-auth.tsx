
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
  login: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
  retryConnection: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

class AuthenticationError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

class ConnectionRetry {
  private readonly maxAttempts = 3;
  private readonly delays = [1000, 3000, 5000]; // 1s, 3s, 5s

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
      await firebaseSignOut(auth);
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
  const isInitialized = useRef(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  const handleRedirect = useCallback((currentUser: User | null) => {
    if (!isInitialized.current) {
        return;
    }
    
    if (isRedirecting.current) return;

    const isOnboardingPage = pathname.startsWith('/onboarding');
    const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/forgot-password');

    let destination: string | null = null;

    if (currentUser) {
      // User is LOGGED IN
      if (!currentUser.profileComplete && currentUser.role !== 'tenant' && !isOnboardingPage) {
        destination = '/onboarding/landlord-welcome';
      } else if (currentUser.profileComplete && (isAuthPage || (isOnboardingPage && pathname !== '/onboarding/complete'))) {
        destination = currentUser.role === 'tenant' ? '/tenant-portal' : '/dashboard';
      }
    } else {
      // User is LOGGED OUT
      if (!isAuthPage && !isOnboardingPage) {
        destination = '/login';
      }
    }
    
    if (destination && destination !== pathname) {
      isRedirecting.current = true;
      router.replace(destination);
      setTimeout(() => { isRedirecting.current = false; }, 1000);
    }
  }, [pathname, router]);

  const updateUserAndRedirect = useCallback(async (firebaseUser: FirebaseUser | null) => {
    if (!firebaseUser) {
      setUser(null);
      setLoading(false);
      isInitialized.current = true;
      handleRedirect(null);
      return;
    }
    
    // If the user in state is the same as the one from the auth event, don't refetch.
    if (user?.uid === firebaseUser.uid && isInitialized.current) {
      handleRedirect(user); // Still check for redirects
      return;
    }

    try {
      const userProfile = await retryHandler.current.execute(fetchUserFromApi);
      setUser(userProfile);
      setError(null);
      isInitialized.current = true;
      
      setTimeout(() => {
        handleRedirect(userProfile);
      }, 100);
      
    } catch (error: any) {
      console.error("Error setting user state:", error);
      setError({
        message: error.code === 'CONNECTION_FAILED' 
          ? 'Unable to connect to server. Please check your connection.' 
          : 'Failed to load user profile. Please try refreshing the page.',
        code: error.code || 'PROFILE_LOAD_FAILED'
      });
      await firebaseSignOut(auth);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [handleRedirect, user]);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      try {
        await updateUserAndRedirect(firebaseUser);
      } catch (err: any) {
        console.error("Critical error in onIdTokenChanged:", err);
        setError({
          message: err.message || 'A critical authentication error occurred.',
          code: err.code || 'AUTH_STATE_CHANGE_FAILED'
        });
        await firebaseSignOut(auth);
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [updateUserAndRedirect]);
  
  const retryConnection = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
        await updateUserAndRedirect(auth.currentUser);
    } catch (err: any) {
       setError({
         message: err.message || 'Failed to reconnect. Please try again.',
         code: err.code
       });
    } finally {
        setIsLoading(false);
    }
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

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    try {
      clearError();
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();
      await processLogin(idToken);
    } catch (error: any) {
      console.error('[Auth] Login failed:', error);
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
      setError({ message, code: error.code });
      throw new AuthenticationError(message, error.code);
    }
  }, [processLogin, clearError]);
  
  const loginWithGoogle = useCallback(async (): Promise<void> => {
    try {
      clearError();
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      const userCredential = await signInWithPopup(auth, provider);
      const idToken = await userCredential.user.getIdToken();
      await processLogin(idToken);
    } catch (error: any) {
      console.error('[Auth] Google login failed:', error);
      let message = 'Google sign-in failed. Please try again.';
      if (error.code !== 'auth/cancelled-popup-request') {
          setError({ message, code: error.code });
          throw new AuthenticationError(message, error.code);
      }
    }
  }, [processLogin, clearError]);

  const logout = useCallback(async () => {
    try {
      setUser(null); 
      clearError();
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Error during logout:", error);
    }
  }, [clearError]);


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
