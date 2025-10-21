
"use client";

import './globals.css';
import { SidebarLayout } from '@/components/layout/app-layout';
import { Toaster } from '@/components/ui/toaster';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
          <SidebarLayout>
              {children}
          </SidebarLayout>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
