
"use client";

import './globals.css';
import '../i18n'; // Import the i18n configuration
import { AppLayout } from '@/components/layout/app-layout';
import { Toaster } from '@/components/ui/toaster';
import { usePathname } from 'next/navigation';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/hooks/use-auth';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

// No metadata here because this is a client component

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  // Pages that should not use the main AppLayout (sidebar, header, etc.)
  const isPublicFlow = pathname.startsWith('/login') 
    || pathname.startsWith('/register') 
    || pathname.startsWith('/forgot-password')
    || pathname.startsWith('/onboarding/accept-invite');

  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        <title>RentEase - Streamlined Property Management</title>
        <meta name="description" content="The easiest way to manage your rental properties." />
      </head>
      <body className="bg-background font-body">
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
          <AuthProvider>
            {isPublicFlow ? (
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
