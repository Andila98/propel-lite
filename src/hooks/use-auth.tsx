
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
  const isInitialized = useRef(false);
  const lastRedirectRef = useRef<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  const handleRedirect = useCallback((currentUser: User | null) => {
    console.log('[Auth] handleRedirect called', { 
      user: currentUser ? { uid: currentUser.uid, role: currentUser.role, profileComplete: currentUser.profileComplete } : null,
      pathname,
      isInitialized: isInitialized.current,
      lastRedirect: lastRedirectRef.current
    });

    if (!isInitialized.current) {
      console.log('[Auth] Not initialized yet, skipping redirect');
      return;
    }

    const isOnboardingPage = pathname.startsWith('/onboarding');
    const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/forgot-password');

    let destination: string | null = null;

    if (currentUser) {
      console.log('[Auth] User is logged in, checking redirect conditions');
      
      // User needs onboarding
      if (!currentUser.profileComplete && currentUser.role !== 'tenant' && !isOnboardingPage) {
        destination = '/onboarding/landlord-welcome';
        console.log('[Auth] User needs onboarding, redirecting to:', destination);
      }
      // User is complete but on auth pages or wrong onboarding page
      else if (currentUser.profileComplete && (isAuthPage || (isOnboardingPage && pathname !== '/onboarding/complete'))) {
        destination = currentUser.role === 'tenant' ? '/tenant-portal' : '/dashboard';
        console.log('[Auth] Complete user on wrong page, redirecting to:', destination);
      }
    } else {
      console.log('[Auth] User is logged out');
      // User is logged out but not on auth pages
      if (!isAuthPage && !isOnboardingPage) {
        destination = '/login';
        console.log('[Auth] Logged out user not on auth page, redirecting to login');
      }
    }
    
    // Only redirect if we have a destination and it's different from current path and last redirect
    if (destination && destination !== pathname && destination !== lastRedirectRef.current) {
      console.log('[Auth] Performing redirect from', pathname, 'to', destination);
      lastRedirectRef.current = destination;
      
      // Use replace to avoid back button issues
      router.replace(destination);
      
      // Clear the last redirect after a delay
      setTimeout(() => {
        lastRedirectRef.current = null;
      }, 2000);
    } else {
      console.log('[Auth] No redirect needed', { destination, pathname, lastRedirect: lastRedirectRef.current });
    }
  }, [pathname, router]);

  const updateUserAndRedirect = useCallback(async (firebaseUser: FirebaseUser | null) => {
    console.log('[Auth] updateUserAndRedirect called', { 
      hasFirebaseUser: !!firebaseUser,
      currentUserId: user?.uid,
      firebaseUserId: firebaseUser?.uid
    });

    if (!firebaseUser) {
      console.log('[Auth] No Firebase user, clearing state');
      setUser(null);
      setLoading(false);
      isInitialized.current = true;
      handleRedirect(null);
      return;
    }
    
    // Avoid unnecessary refetches if user hasn't changed
    if (user?.uid === firebaseUser.uid && isInitialized.current) {
      console.log('[Auth] Same user, just checking redirects');
      setLoading(false);
      handleRedirect(user);
      return;
    }

    try {
      console.log('[Auth] Fetching user profile from API');
      const userProfile = await retryHandler.current.execute(fetchUserFromApi);
      
      console.log('[Auth] User profile fetched:', { 
        uid: userProfile?.uid, 
        role: userProfile?.role, 
        profileComplete: userProfile?.profileComplete 
      });
      
      setUser(userProfile);
      setError(null);
      isInitialized.current = true;
      
      // Small delay to ensure state updates are processed
      setTimeout(() => {
        handleRedirect(userProfile);
      }, 50);
      
    } catch (error: any) {
      console.error("[Auth] Error setting user state:", error);
      setError({
        message: error.code === 'CONNECTION_FAILED' 
          ? 'Unable to connect to server. Please check your connection.' 
          : 'Failed to load user profile. Please try refreshing the page.',
        code: error.code || 'PROFILE_LOAD_FAILED'
      });
      await firebaseSignOut(auth);
      setUser(null);
      isInitialized.current = true;
    } finally {
      setLoading(false);
    }
  }, [handleRedirect, user]);

  useEffect(() => {
    console.log('[Auth] Setting up onIdTokenChanged listener');
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
        isInitialized.current = true;
      }
    });

    return () => unsubscribe();
  }, [updateUserAndRedirect]);
  
  const retryConnection = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await updateUserAndRedirect(auth.currentUser);
    } catch (err: any) {
      setError({
        message: err.message || 'Failed to reconnect. Please try again.',
        code: err.code
      });
    } finally {
      setLoading(false);
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
      throw new AuthenticationError(responseBody.error || 'Login failed.', responseBody.errorCode);
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
      router.replace('/login');
    } catch (error) {
      console.error("Error during logout:", error);
    }
  }, [clearError, router]);

  // Show loading screen with improved UX
  if (loading && !isInitialized.current) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <div className="text-center">
            <p className="text-lg font-medium">Loading...</p>
            <p className="text-sm text-muted-foreground">Please wait while we prepare your dashboard</p>
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
