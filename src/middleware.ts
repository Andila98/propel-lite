
import { NextRequest, NextResponse } from 'next/server';
import { authConfig } from './config/server-config';
import { admin } from './lib/firebase-admin';

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // If the path is public, skip the middleware
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(authConfig.cookieName)?.value;

  if (!sessionCookie) {
      console.log(`[MIDDLEWARE] No session cookie found for path: ${pathname}. Redirecting to login.`);
      return redirectToLogin(request);
  }

  try {
    const decodedToken = await admin.auth().verifySessionCookie(sessionCookie, true);
    
    if (!decodedToken) {
        return redirectToLogin(request, true);
    }
    
    const role = decodedToken.role;

    // RBAC: Enforce strict role-based access for tenants
    if (role === 'tenant' && !pathname.startsWith('/tenant-portal')) {
        console.log(`[MIDDLEWARE_RBAC] Redirecting tenant from ${pathname} to /tenant-portal`);
        return NextResponse.redirect(new URL('/tenant-portal', request.url));
    }

    const response = NextResponse.next();
    // Optional: set a header for backend services to easily access the user's role
    response.headers.set('x-user-role', role || 'unknown');
    return response;

  } catch (error: any) {
    console.error(`[MIDDLEWARE_ERROR] Invalid session cookie for path: ${pathname}.`, {
      errorMessage: error.message,
    });
    return redirectToLogin(request, true);
  }
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
