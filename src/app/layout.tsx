
"use client";

import './globals.css';
import { AppLayout } from '@/components/layout/app-layout';
import { Toaster } from '@/components/ui/toaster';
import { Inter } from 'next/font/google';

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
      </head>
      <body className="bg-background font-body">
          <AppLayout>
              {children}
          </AppLayout>
          <Toaster />
      </body>
    </html>
  );
}
