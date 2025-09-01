
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
  onAuthStateChanged,
  User as FirebaseUser
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

// Enhanced error handling
class AuthenticationError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

// Connection retry logic
class ConnectionRetry {
  private attempts = 0;
  private readonly maxAttempts = 3;
  private readonly delays = [1000, 3000, 5000]; // 1s, 3s, 5s

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
      try {
        const result = await operation();
        this.reset(); // Reset on success
        return result;
      } catch (error: any) {
        lastError = error;
        console.warn(`[Auth] Attempt ${attempt + 1} failed:`, error.message);

        // Don't retry for certain error types
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

  reset() {
    this.attempts = 0;
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
    // Server session is gone, sign out the client
    await firebaseSignOut(auth);
    return null;
  }

  // For other errors, throw to trigger retry logic
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

  // Clear any existing error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Enhanced redirect logic
  const handleRedirect = useCallback((user: User | null) => {
    if (!user || !isInitialized.current) return;
    
    const isOnboardingPage = pathname.startsWith('/onboarding');
    const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');
    
    // If user's profile is complete but they are on an onboarding page
    if (user.profileComplete && isOnboardingPage && pathname !== '/onboarding/complete') {
      const destination = user.role === 'tenant' ? '/tenant-portal' : '/dashboard';
      console.debug(`[Auth] Redirecting complete profile from ${pathname} to ${destination}`);
      router.push(destination);
      return;
    }
    
    // If user needs onboarding but isn't in the flow
    if (user.role !== 'tenant' && !user.profileComplete && !isOnboardingPage) {
      console.debug(`[Auth] Redirecting incomplete profile to onboarding`);
      router.push('/onboarding/landlord-welcome');
      return;
    }
    
    // If user is authenticated but on auth pages, redirect to their portal
    if (isAuthPage && user.profileComplete) {
      const destination = user.role === 'tenant' ? '/tenant-portal' : '/dashboard';
      console.debug(`[Auth] Redirecting authenticated user from ${pathname} to ${destination}`);
      router.push(destination);
    }
  }, [pathname, router]);

  // Enhanced user update with retry logic
  const updateUserAndRedirect = useCallback(async (firebaseUser: FirebaseUser | null) => {
    if (!firebaseUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const userProfile = await retryHandler.current.execute(fetchUserFromApi);
      setUser(userProfile);
      setError(null); // Clear any previous errors
      handleRedirect(userProfile);
    } catch (error: any) {
      console.error("Error fetching user profile:", error);
      
      // Set appropriate error message
      if (error.code === 'CONNECTION_FAILED') {
        setError({
          message: 'Unable to connect to server. Please check your connection.',
          code: error.code
        });
      } else {
        setError({
          message: 'Failed to load user profile. Please try refreshing the page.',
          code: 'PROFILE_LOAD_FAILED'
        });
      }

      // Sign out on persistent failures
      await firebaseSignOut(auth);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [handleRedirect]);

  // Initialize auth state listener
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, (firebaseUser) => {
      if (!isInitialized.current) {
        isInitialized.current = true;
      }
      updateUserAndRedirect(firebaseUser);
    });

    return () => unsubscribe();
  }, [updateUserAndRedirect]);

  // Manual retry function
  const retryConnection = useCallback(async () => {
    if (!auth.currentUser) return;
    
    setLoading(true);
    setError(null);
    await updateUserAndRedirect(auth.currentUser);
  }, [updateUserAndRedirect]);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    setLoading(true);
    await updateUserAndRedirect(auth.currentUser);
  }, [updateUserAndRedirect]);

  // Enhanced login processing
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
      const error = new AuthenticationError(
        responseBody.error || 'Login failed.',
        responseBody.errorCode
      );
      throw error;
    }

    await refreshUser();
  }, [refreshUser]);

  // Enhanced login with better error handling
  const login = useCallback(async (email: string, password: string): Promise<void> => {
    try {
      clearError();
      const userCredential = await retryHandler.current.execute(() => 
        signInWithEmailAndPassword(auth, email, password)
      );
      const idToken = await userCredential.user.getIdToken();
      await retryHandler.current.execute(() => processLogin(idToken));
    } catch (error: any) {
      console.error('[Auth] Login failed:', error);
      
      // Transform Firebase errors to user-friendly messages
      let message = 'Login failed. Please try again.';
      let code = error.code;

      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          message = 'Invalid email or password. Please check your credentials.';
          break;
        case 'auth/user-disabled':
          message = 'Your account has been disabled. Please contact support.';
          break;
        case 'auth/too-many-requests':
          message = 'Too many failed attempts. Please wait before trying again.';
          break;
        case 'auth/network-request-failed':
        case 'CONNECTION_FAILED':
          message = 'Network error. Please check your internet connection.';
          break;
        case 'INCOMPLETE_PROFILE':
          // This should be handled by the auth provider's redirect logic
          message = 'Please complete your profile setup.';
          break;
      }

      setError({ message, code });
      throw new AuthenticationError(message, code);
    }
  }, [processLogin, clearError]);
  
  // Enhanced Google login
  const loginWithGoogle = useCallback(async (): Promise<void> => {
    try {
      clearError();
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      const userCredential = await retryHandler.current.execute(() =>
        signInWithPopup(auth, provider)
      );
      const idToken = await userCredential.user.getIdToken();
      await retryHandler.current.execute(() => processLogin(idToken));
    } catch (error: any) {
      console.error('[Auth] Google login failed:', error);
      
      let message = 'Google sign-in failed. Please try again.';
      let code = error.code;

      switch (error.code) {
        case 'auth/popup-closed-by-user':
          message = 'Sign-in was cancelled. Please try again.';
          break;
        case 'auth/popup-blocked':
          message = 'Pop-up blocked. Please allow pop-ups and try again.';
          break;
        case 'auth/cancelled-popup-request':
          // Don't show error for cancelled popup
          return;
        case 'CONNECTION_FAILED':
          message = 'Network error. Please check your internet connection.';
          break;
      }

      setError({ message, code });
      throw new AuthenticationError(message, code);
    }
  }, [processLogin, clearError]);

  // Enhanced logout
  const logout = useCallback(async () => {
    try {
      setUser(null);
      clearError();
      
      // Call server logout endpoint
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error("Error during server-side logout:", error);
    } finally {
      // Always sign out from Firebase and redirect
      await firebaseSignOut(auth);
      router.push('/login');
    }
  }, [router, clearError]);

  // Show loading screen
  if (loading && !isInitialized.current) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          {error && (
            <div className="text-center max-w-md">
              <p className="text-destructive mb-2">{error.message}</p>
              <button 
                onClick={retryConnection}
                className="text-sm underline text-primary hover:no-underline"
              >
                Retry Connection
              </button>
            </div>
          )}
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
