
import { NextRequest, NextResponse } from 'next/server';
import { authConfig } from './config/server-config';

// Specify the Edge runtime
export const runtime = 'edge';

// Paths that do not require authentication
const publicPaths = [
  '/login',
  '/register',
  '/forgot-password',
  '/onboarding', // Allow all onboarding routes
  '/api/auth', // Allow all auth API routes
];

function isPublic(pathname: string): boolean {
  return publicPaths.some(path => pathname.startsWith(path));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow public paths, static files, and images to pass through
  if (isPublic(pathname) || pathname.startsWith('/_next') || /\.(png|jpg|svg|ico)$/.test(pathname)) {
    return NextResponse.next();
  }

  // Verify the session cookie exists for all other routes
  const sessionCookie = request.cookies.get(authConfig.cookieName)?.value;

  if (!sessionCookie) {
    // If the request is for an API route, return a 401 Unauthorized response
    if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // For all other pages (including the root '/'), redirect to the login page
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    // Only add a redirect query param if the original path was not the root
    if (pathname !== '/') {
        url.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(url);
  }

  // The actual verification of the cookie (role, expiration) will happen
  // in the API routes or server components. The middleware just ensures a cookie exists.
  return NextResponse.next();
}

// Match all paths except for specific asset folders.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|placeholders|media).*)',
  ],
};
