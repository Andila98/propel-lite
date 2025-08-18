
"use client";

import './globals.css';
import '../i18n'; // Import the i18n configuration
import { AppLayout } from '@/components/layout/app-layout';
import { Toaster } from '@/components/ui/toaster';
import { usePathname } from 'next/navigation';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/hooks/use-auth';

// No metadata here because this is a client component

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  // Pages that should not use the main AppLayout (sidebar, header, etc.)
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');
  const isPublicFlow = isAuthPage;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>RentEase - Streamlined Property Management</title>
        <meta name="description" content="The easiest way to manage your rental properties." />
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
