
import { NextRequest, NextResponse } from 'next/server';

// Since Firebase auth is removed, we will use a simplified middleware.
// In this mock setup, we assume a user is "logged in" if they have a mock session cookie.

// Paths that do not require authentication
const publicPaths = [
  '/login',
  '/register',
  '/onboarding',
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
  // API routes will handle their own logic (returning mock data).
  if (isPublic(pathname) || pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Check for the mock session cookie on protected routes.
  const sessionCookie = request.cookies.get('mockSession')?.value;

  if (!sessionCookie) {
      console.log(`[MIDDLEWARE_REDIRECT] No session cookie for protected path: ${pathname}. Redirecting.`);
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Match all paths except for the ones starting with specific asset folders.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|placeholders|media).*)',
  ],
};
