
import { NextRequest, NextResponse } from 'next/server';
import { authConfig } from './config/server-config';
import { auth } from './lib/firebase-admin';

// Paths that do not require authentication
const publicPaths = [
  // Auth pages
  '/login',
  '/register',
  '/forgot-password',

  // Onboarding flow is public
  '/onboarding',

  // Public APIs & webhooks
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/accept-invite',
  '/api/webhooks',

  // Static assets and internal framework paths
  '/_next',
  '/favicon.ico',
  '/placeholders',
  '/media',
];

function isPublic(pathname: string): boolean {
  // Allow root path for landing page scenarios
  if (pathname === '/') return true;
  return publicPaths.some(path => pathname.startsWith(path));
}

/**
 * Middleware for route protection.
 * It checks for a session cookie on protected routes and redirects to login if not found.
 * The actual verification of the cookie's validity happens in API routes or page server components.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(authConfig.cookieName)?.value;

  if (!sessionCookie) {
      console.log(`[MIDDLEWARE_REDIRECT] No session cookie for protected path: ${pathname}. Redirecting.`);
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname); // Pass the original path for redirection after login
      url.searchParams.set('error', 'session_expired');
      return NextResponse.redirect(url);
  }

  // The session cookie exists, allow the request to proceed.
  // The actual verification of the token happens in the API routes and server components
  // using the `verifyApiAuth` utility.
  return NextResponse.next();
}


// Match all paths except for the ones starting with the public asset folders
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|placeholders|media).*)',
  ],
};
