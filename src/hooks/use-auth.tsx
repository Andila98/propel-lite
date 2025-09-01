
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

  if (response.ok) {
    const userProfile = await response.json();
    return userProfile;
  }
  
  if (response.status === 401) {
    await firebaseSignOut(auth);
    return null;
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

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleRedirect = useCallback((currentUser: User | null) => {
    if (!isInitialized.current) return;
    
    const isOnboardingPage = pathname.startsWith('/onboarding');
    const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/forgot-password');
    
    if (currentUser) {
        // User is logged in
        if (currentUser.role !== 'tenant' && !currentUser.profileComplete && !isOnboardingPage) {
            router.push('/onboarding/landlord-welcome');
        } else if (currentUser.profileComplete && (isAuthPage || (isOnboardingPage && pathname !== '/onboarding/complete'))) {
            router.push('/dashboard');
        }
    } else {
        // User is not logged in, but trying to access a protected page
        if (!isAuthPage && !isOnboardingPage) {
            router.push('/login');
        }
    }
  }, [pathname, router]);

  const updateUserAndRedirect = useCallback(async (firebaseUser: FirebaseUser | null) => {
    if (!firebaseUser) {
      setUser(null);
      setLoading(false);
      handleRedirect(null);
      return;
    }

    try {
      const userProfile = await retryHandler.current.execute(fetchUserFromApi);
      setUser(userProfile);
      setError(null);
      handleRedirect(userProfile);
    } catch (error: any) {
      console.error("Error fetching user profile:", error);
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
  }, [handleRedirect]);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, (firebaseUser) => {
      if (!isInitialized.current) {
        setLoading(false);
        isInitialized.current = true;
      }
      updateUserAndRedirect(firebaseUser);
    });

    return () => unsubscribe();
  }, [updateUserAndRedirect]);

  const retryConnection = useCallback(async () => {
    setLoading(true);
    setError(null);
    await updateUserAndRedirect(auth.currentUser);
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
    
    const responseBody = await response.json();

    if (!response.ok) {
        if (responseBody.code === 'INCOMPLETE_PROFILE') {
            console.log("[Auth] Incomplete profile detected. Proceeding to refresh and redirect.");
        } else {
            throw new AuthenticationError(responseBody.error || 'Login failed.', responseBody.code);
        }
    }
    await refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    try {
      clearError();
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();
      await processLogin(idToken);
    } catch (error: any) {
      console.error('[Auth] Login failed:', error);
      let message = 'Login failed. Please try again.';
      if (error instanceof TypeError) { // Network error
          message = 'The server is not responding. Please try again in a moment.';
          error.code = 'CONNECTION_FAILED';
      } else {
          switch (error.code) {
              case 'auth/invalid-credential':
                  message = 'Invalid email or password.';
                  break;
              case 'auth/user-disabled':
                  message = 'Your account has been disabled.';
                  break;
              case 'auth/too-many-requests':
                  message = 'Too many failed attempts. Please wait before trying again.';
                  break;
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
      router.push('/login');
    } catch (error) {
      console.error("Error during logout:", error);
    }
  }, [router, clearError]);

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
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
