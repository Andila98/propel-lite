
import { NextRequest, NextResponse } from 'next/server';
import { getTokens } from 'next-firebase-auth-edge';
import { authConfig } from './config/server-config';

// Paths that do not require authentication
const publicPaths = [
  // Auth pages
  '/login',
  '/register',
  '/forgot-password',

  // Onboarding flow
  '/onboarding/welcome',
  '/onboarding/landlord-welcome',
  '/onboarding/accept-invite',

  // Public APIs & webhooks
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/logout',
  '/api/auth/accept-invite',
  '/api/webhooks/mpesa',
  '/api/webhooks/stripe',

  // Static assets
  '/_next/static',
  '/_next/image',
  '/favicon.ico',
  '/placeholders',
  '/media',
];

function isPublic(pathname: string): boolean {
  return publicPaths.some(path => pathname.startsWith(path));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  try {
    const tokens = await getTokens(request, authConfig);
    
    if (!tokens) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname + request.nextUrl.search);
      return NextResponse.redirect(url);
    }
    
    const { role } = tokens.decodedToken;

    if (process.env.NODE_ENV === 'development') {
      console.log(`[MIDDLEWARE_DEBUG] Path: ${pathname} | Role: ${role || 'none'} | UID: ${tokens.decodedToken.uid}`);
    }
    
    // Enforce strict RBAC for tenants
    if (role === 'tenant' && !pathname.startsWith('/tenant-portal')) {
        return NextResponse.redirect(new URL('/tenant-portal', request.url));
    }

    const response = NextResponse.next();
    // Optional: set a header for backend services to easily access the user's role
    response.headers.set('x-user-role', role || 'unknown');
    return response;

  } catch (error: any) {
    console.error(`[MIDDLEWARE_ERROR] Invalid token or session expired for path: ${pathname}. Redirecting to login.`, {
      errorMessage: error.message,
      errorCode: error.code,
    });
    
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('error', 'session_expired');
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
}

// Match all paths except for the ones starting with the public asset folders
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|placeholders|media).*)',
  ],
};
