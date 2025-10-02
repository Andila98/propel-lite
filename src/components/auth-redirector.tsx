
"use client";

import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * A client component that handles redirection based on auth status.
 * This is meant to be used on the root page.
 * The logic is now handled inside useAuth, this component primarily shows a loading UI.
 */
export function AuthRedirector() {
  const { loading } = useAuth();

  // The useAuth hook handles all redirect logic.
  // We just need to show a loading state while it works.
  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <p className="text-lg font-medium">Loading your experience...</p>
        </div>
      </div>
    );
  }
  
  // Fallback loading state. In a correct flow, the user should always be
  // redirected by the AuthProvider before this is visible for long.
   return (
     <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
  );
}
