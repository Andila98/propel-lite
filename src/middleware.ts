
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

// This middleware is now much simpler. It only checks for the existence of the session cookie.
// The actual verification (which requires Node.js APIs) is delegated to the API routes
// or page-level `getServerSideProps` functions.
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // If the path is public, skip the middleware
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(authConfig.cookieName)?.value;

  if (!sessionCookie) {
      console.log(`[MIDDLEWARE] No session cookie found for path: ${pathname}. Redirecting to login.`);
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('error', 'session_expired');
      return NextResponse.redirect(url);
  }

  // Allow the request to proceed. The actual token verification will happen
  // in the API route or page component that requires the Node.js runtime.
  return NextResponse.next();
}


function redirectToLogin(request: NextRequest, sessionExpired = false) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    if (sessionExpired) {
        url.searchParams.set('error', 'session_expired');
    }
    const response = NextResponse.redirect(url);

    // Clear the potentially invalid cookie
    response.cookies.set({
        name: authConfig.cookieName,
        value: '',
        path: '/',
        maxAge: -1,
    });
    return response;
}


// Match all paths except for the ones starting with the public asset folders
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|placeholders|media).*)',
  ],
};
