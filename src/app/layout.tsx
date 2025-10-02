
"use client";

import './globals.css';
import { AppLayout } from '@/components/layout/app-layout';
import { Toaster } from '@/components/ui/toaster';
import { usePathname } from 'next/navigation';
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
        <title>Propel Lite - Smart Property Management</title>
        <meta name="description" content="AI-powered tools to streamline your rental business." />
      </head>
      <body className="bg-background font-body">
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
      </body>
    </html>
  );
}
