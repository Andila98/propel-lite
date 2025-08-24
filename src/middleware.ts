
import { NextRequest, NextResponse } from 'next/server';
import { authConfig } from '@/config/server-config';
import { auth } from '@/lib/firebase-admin';

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow public paths and most API routes to pass through without session checks.
  if (isPublic(pathname) || pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // Check for the session cookie on protected routes.
  const sessionCookie = request.cookies.get(authConfig.cookieName)?.value;

  if (!sessionCookie) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
  }

  try {
    // Verify the cookie on the edge
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    const userRole = decodedClaims.role;

    // If a tenant tries to access a non-tenant page, redirect to their portal
    if (userRole === 'tenant' && !tenantOnlyPaths.some(p => pathname.startsWith(p))) {
        const url = request.nextUrl.clone();
        url.pathname = '/tenant-portal';
        return NextResponse.redirect(url);
    }
    
    // If a non-tenant tries to access the tenant portal, redirect them to the dashboard
    if (userRole !== 'tenant' && tenantOnlyPaths.some(p => pathname.startsWith(p))) {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
    }

    return NextResponse.next();

  } catch (error) {
    console.warn(`[MIDDLEWARE_AUTH_ERROR] Invalid session cookie for path: ${pathname}. Redirecting.`, error);
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    // Clear the invalid cookie
    url.cookies.delete(authConfig.cookieName);
    return NextResponse.redirect(url);
  }
}

// Match all paths except for the ones starting with specific asset folders.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|placeholders|media).*)',
  ],
};
