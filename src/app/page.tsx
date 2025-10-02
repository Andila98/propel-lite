
"use client";

import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * This is the root page of the application.
 * Its sole responsibility is to act as a loading gateway while the AuthProvider
 * initializes, determines the user's authentication state, and performs the
 * initial redirect. It does not contain any redirect logic itself.
 */
export default function HomePage() {
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


  // The useAuth hook handles all redirect logic.
  // We just need to show a loading state while it works.
  // This prevents UI flicker and race conditions.
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4 text-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <div className="space-y-2">
            <p className="text-lg font-medium">Initializing...</p>
            <p className="text-sm text-muted-foreground">
              Please wait while we prepare the application
            </p>
          </div>
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
