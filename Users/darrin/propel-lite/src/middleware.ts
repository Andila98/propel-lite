
import { NextRequest, NextResponse } from 'next/server';
import { authConfig } from '@/config/server-config';

// Paths that do not require authentication
const publicPaths = [
  '/login',
  '/register',
  '/forgot-password',
  '/onboarding/accept-invite', // Needs to be public to accept an invitation
  '/_next',
  '/favicon.ico',
];

function isPublic(pathname: string): boolean {
  if (pathname === '/') return true;
  return publicPaths.some(path => pathname.startsWith(path));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow public paths and API routes to pass through without checks.
  if (isPublic(pathname) || pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // Check for the session cookie on protected routes.
  const sessionCookie = request.cookies.get(authConfig.cookieName)?.value;

  if (!sessionCookie) {
      console.log(`[MIDDLEWARE_REDIRECT] No session cookie for protected path: ${pathname}. Redirecting.`);
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      if (pathname !== '/dashboard') {
        url.searchParams.set('redirect', pathname);
      }
      return NextResponse.redirect(url);
  }

  // On the backend, we would verify the cookie here using the Admin SDK.
  // Since middleware runs in the edge runtime, we can't use the full Node.js Admin SDK.
  // A common pattern is to have a lightweight session check here and full verification in API routes/server components.
  // For this project, we'll trust the presence of the cookie in the middleware and verify it on the backend endpoints.

  return NextResponse.next();
}

// Match all paths except for the ones starting with specific asset folders.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|placeholders|media).*)',
  ],
};
