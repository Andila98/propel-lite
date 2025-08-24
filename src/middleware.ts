
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

const tenantOnlyPaths = ['/tenant-portal'];

function isPublic(pathname: string): boolean {
  if (pathname === '/') return true;
  return publicPaths.some(path => pathname.startsWith(path));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow public paths to pass through without session checks.
  if (isPublic(pathname) || pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // Check for the session cookie on all protected routes.
  const sessionCookie = request.cookies.get(authConfig.cookieName)?.value;

  if (!sessionCookie) {
      console.log(`[MIDDLEWARE] No session cookie found for path: ${pathname}. Redirecting to login.`);
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
  }

  // The actual verification of the cookie and role-based redirects will be handled
  // on the client-side by the AuthProvider, which uses the /api/auth/me endpoint.
  // This keeps the middleware light and fast.

  return NextResponse.next();
}

// Match all paths except for the ones starting with specific asset folders.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|placeholders|media).*)',
  ],
};
