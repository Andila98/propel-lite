
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RedirectState {
  isRedirecting: boolean;
  destination: string | null;
  error: string | null;
}

export default function HomePage() {
  const { user, loading, error: authError, retryConnection, clearError } = useAuth();
  const router = useRouter();
  const [redirectState, setRedirectState] = useState<RedirectState>({
    isRedirecting: false,
    destination: null,
    error: null
  });

  // Enhanced redirect logic with error handling
  const performRedirect = useCallback((destination: string) => {
    setRedirectState({
      isRedirecting: true,
      destination,
      error: null
    });

    try {
      router.replace(destination);
    } catch (error: any) {
      console.error('[HomePage] Redirect failed:', error);
      setRedirectState(prev => ({
        ...prev,
        isRedirecting: false,
        error: 'Navigation failed. Please try refreshing the page.'
      }));
    }
  }, [router]);

  // Main redirect effect
  useEffect(() => {
    if (loading || redirectState.isRedirecting) return;

    if (user) {
      // User is authenticated - redirect based on role and profile completion
      let destination: string;

      if (!user.profileComplete) {
        // User needs to complete onboarding
        destination = user.role === 'tenant' ? '/tenant-portal' : '/onboarding/landlord-welcome';
      } else {
        // User profile is complete - redirect to their portal
        destination = user.role === 'tenant' ? '/tenant-portal' : '/dashboard';
      }

      console.info(`[HomePage] Redirecting authenticated user (${user.role}) to: ${destination}`);
      performRedirect(destination);
    } else if (!authError) {
      // No user and no auth error - redirect to login
      console.info('[HomePage] Redirecting unauthenticated user to login');
      performRedirect('/login');
    }
  }, [user, loading, authError, redirectState.isRedirecting, performRedirect]);

  // Handle retry connection
  const handleRetry = useCallback(async () => {
    clearError();
    setRedirectState({
      isRedirecting: false,
      destination: null,
      error: null
    });
    
    try {
      await retryConnection();
    } catch (error) {
      console.error('[HomePage] Retry connection failed:', error);
    }
  }, [retryConnection, clearError]);

  // Handle manual refresh
  const handleRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  // Render loading state
  if (loading || redirectState.isRedirecting) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4 text-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <div className="space-y-2">
            <p className="text-lg font-medium">
              {loading ? 'Loading...' : `Redirecting to ${redirectState.destination}...`}
            </p>
            <p className="text-sm text-muted-foreground">
              Please wait while we prepare your dashboard
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (authError || redirectState.error) {
    const errorMessage = redirectState.error || authError?.message || 'An unexpected error occurred';
    const isConnectionError = authError?.code === 'CONNECTION_FAILED' || 
                             authError?.code === 'SERVICE_UNAVAILABLE';

    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <AlertCircle className="mx-auto h-16 w-16 text-destructive" />
            <h1 className="mt-4 text-2xl font-bold">Something went wrong</h1>
            <p className="mt-2 text-muted-foreground">
              We encountered an error while loading your dashboard
            </p>
          </div>

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {errorMessage}
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            {isConnectionError ? (
              <Button 
                onClick={handleRetry} 
                className="w-full"
                variant="default"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry Connection
              </Button>
            ) : (
              <Button 
                onClick={handleRefresh} 
                className="w-full"
                variant="default"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Page
              </Button>
            )}

            <Button 
              onClick={() => performRedirect('/login')} 
              variant="outline"
              className="w-full"
            >
              Go to Login
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>If this problem persists, please contact support</p>
          </div>
        </div>
      </div>
    );
  }

  // Fallback loading state (shouldn't normally reach here)
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="text-lg font-medium">Initializing...</p>
      </div>
    </div>
  );
}
