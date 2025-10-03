
"use client";

import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * A client component that handles redirection based on auth status.
 * This is meant to be used on the root page.
 */
export function AuthRedirector() {
  const { status, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'initializing' || status === 'loading') {
      return; // Wait until auth state is resolved
    }

    const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/forgot-password');
    const isOnboardingPage = pathname.startsWith('/onboarding');
    const isAcceptInvitePage = pathname.startsWith('/onboarding/accept-invite');
    
    let destination: string | null = null;

    if (status === 'authenticated' && user) {
        if (!user.profileComplete && user.role !== 'tenant' && !isOnboardingPage) {
            destination = '/onboarding/landlord-welcome';
        } else if (isAuthPage) {
            destination = user.role === 'tenant' ? '/tenant-portal' : '/dashboard';
        }
    } else if (status === 'unauthenticated') {
        if (!isAuthPage && !isAcceptInvitePage) {
            destination = '/login';
        }
    }

    if (destination && destination !== pathname) {
        router.replace(destination);
    }
  }, [status, user, pathname, router]);

  // Show a loading indicator while initializing or loading user data.
  if (status === 'initializing' || status === 'loading') {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <p className="text-lg font-medium">Loading your experience...</p>
        </div>
      </div>
    );
  }
  
  // Render nothing once authentication is resolved and redirection has been handled.
  // The correct page content will be rendered by the layout.
  return null;
}
