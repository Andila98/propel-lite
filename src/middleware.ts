
import { NextRequest, NextResponse } from 'next/server';
import { authConfig } from './config/server-config';

// Paths that do not require authentication
const publicPaths = [
  // Auth pages
  '/login',
  '/register',
  '/forgot-password',

  // Onboarding flow
  '/onboarding',

  // Public APIs & webhooks
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/logout',
  '/api/auth/accept-invite',
  '/api/webhooks/mpesa',
  '/api/webhooks/stripe',

  // Static assets and internal framework paths
  '/_next/static',
  '/_next/image',
  '/favicon.ico',
  '/placeholders',
  '/media',
];

function isPublic(pathname: string): boolean {
  if (pathname.startsWith('/onboarding')) return true;
  return publicPaths.some(path => pathname.startsWith(path));
}

/**
 * Middleware for route protection.
 * It checks for a session cookie on protected routes and redirects to login if not found.
 * The actual verification of the cookie's validity happens in API routes or page server components.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // If the path is public, skip the middleware
  if (isPublic(pathname)) {
    // console.log(`[MIDDLEWARE_PUBLIC] Allowing access to public path: ${pathname}`);
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(authConfig.cookieName)?.value;

  if (!sessionCookie) {
      console.log(`[MIDDLEWARE_REDIRECT] No session cookie found for protected path: ${pathname}. Redirecting to login.`);
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('error', 'session_expired');
      return NextResponse.redirect(url);
  }

  // Allow the request to proceed. The actual token verification will happen
  // in the API route or page component that requires the Node.js runtime.
  // console.log(`[MIDDLEWARE_PROTECTED] Session cookie found for path: ${pathname}. Allowing request.`);
  return NextResponse.next();
}


// Match all paths except for the ones starting with the public asset folders
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|placeholders|media).*)',
  ],
};
