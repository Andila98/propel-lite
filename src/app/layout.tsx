
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
  const isPublicRoute = publicRoutes.includes(pathname);

  useEffect(() => {
    if (status === 'unauthenticated' && !isPublicRoute) {
      router.push('/login');
    }
    if (status === 'authenticated') {
        if (user?.profileComplete === false && !isOnboarding) {
            router.push('/onboarding/landlord-welcome');
        } else if (user?.profileComplete === true && (isPublicRoute || isOnboarding)) {
            router.push('/dashboard');
        }
    }
  }, [status, pathname, router, user, isPublicRoute, isOnboarding]);

  if (status === 'loading') {
    return <div className="flex h-screen w-full items-center justify-center">Loading...</div>;
  }

  if (isPublicRoute || (status === 'authenticated' && user?.profileComplete === false)) {
    return <>{children}</>;
  }
  
  if (status === 'authenticated' && user?.profileComplete === true) {
     return <SidebarLayout>{children}</SidebarLayout>;
  }

  return null;
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
