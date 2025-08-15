
"use client";

import type { Metadata } from 'next';
import './globals.css';
import '../i18n'; // Import the i18n configuration
import { AppLayout } from '@/components/layout/app-layout';
import { Toaster } from '@/components/ui/toaster';
import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/hooks/use-auth';

const metadata: Metadata = {
  title: 'RentEase',
  description: 'Streamlined Property Management',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/onboarding/accept-invite');
  const isOnboarding = pathname.startsWith('/onboarding') && !isAuthPage;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        ></link>
        
      </head>
      <body className="bg-background">
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
          <AuthProvider>
            {isAuthPage || isOnboarding ? (
              <div className="bg-background">{children}</div>
            ) : (
              <AppLayout>
                  {children}
              </AppLayout>
            )}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
