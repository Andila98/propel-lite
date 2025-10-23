
"use client";

import './globals.css';
import { AuthProvider } from '@/hooks/use-auth';
import { Toaster } from '@/components/ui/toaster';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import React, { useEffect } from 'react';
import { SidebarLayout } from '@/components/layout/app-layout';
import { Loader2 } from 'lucide-react';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

function AppContent({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const publicRoutes = ['/login', '/signup', '/forgot-password', '/onboarding/accept-invite'];
  const isOnboarding = pathname.startsWith('/onboarding');
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  useEffect(() => {
    if (status === 'unauthenticated' && !isPublicRoute) {
      router.replace('/login');
    }
    if (status === 'authenticated') {
      if (user?.profileComplete === false && !isOnboarding) {
        router.replace('/onboarding/landlord-welcome');
      } else if (user?.profileComplete === true && (isPublicRoute || isOnboarding)) {
        router.replace('/dashboard');
      }
    }
  }, [status, pathname, router, user, isPublicRoute, isOnboarding]);

  if (status === 'loading') {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Render children within a layout if authenticated and profile is complete
  if (status === 'authenticated' && user?.profileComplete) {
    if (isPublicRoute) return null; // Avoid flash of public content
    return <SidebarLayout>{children}</SidebarLayout>;
  }

  // Render onboarding or public pages without the main app layout
  if ((status === 'authenticated' && !user?.profileComplete) || isPublicRoute) {
    return <>{children}</>;
  }

  // Fallback for unauthenticated users on non-public routes (will be redirected by useEffect)
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        <title>Propel Lite - Smart Property Management</title>
        <meta name="description" content="AI-powered tools to streamline your rental business." />
        <script src="https://animatedicons.co/i/d53957999.js" async></script>
      </head>
      <body className="bg-background font-body">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <AppContent>{children}</AppContent>
          </AuthProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
