
"use client";

import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * A client component that handles redirection based on auth status.
 * This is meant to be used on the root page.
 */
export function AuthRedirector() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait until the auth state is determined
    if (loading) {
      return;
    }

    if (user) {
      if (!user.profileComplete && user.role !== 'tenant') {
          router.replace('/onboarding/landlord-welcome');
      } else {
          const destination = user.role === 'tenant' ? '/tenant-portal' : '/dashboard';
          router.replace(destination);
      }
    } else {
      router.replace('/login');
    }
  }, [user, loading, router]);

  // Show a loading state while determining where to redirect
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="text-lg font-medium">Loading your experience...</p>
      </div>
    </div>
  );
}
