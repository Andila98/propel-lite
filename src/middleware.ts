
import { NextRequest, NextResponse } from 'next/server';
import { getTokens } from 'next-firebase-auth-edge';
import { authConfig } from './config/server-config';

const publicPaths = [
  '/login',
  '/register',
  '/forgot-password',
  '/onboarding/welcome',
  '/onboarding/landlord-welcome',
  '/onboarding/accept-invite'
];

const apiPublicPaths = [
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/logout',
  '/api/auth/accept-invite',
  '/api/webhooks/mpesa',
  '/api/webhooks/stripe',
];

const staticAssetPaths = [
    '/_next/static',
    '/_next/image',
    '/favicon.ico',
    '/placeholders',
    '/media',
];

function isPublic(pathname: string): boolean {
    if (staticAssetPaths.some(path => pathname.startsWith(path))) {
        return true;
    }
    if (apiPublicPaths.some(path => pathname.startsWith(path))) {
        return true;
    }
    if (publicPaths.some(path => pathname.startsWith(path))) {
        return true;
    }
    return false;
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
    
    if (role === 'tenant' && !pathname.startsWith('/tenant-portal')) {
        return NextResponse.redirect(new URL('/tenant-portal', request.url));
    }

    const response = NextResponse.next();
    response.headers.set('x-user-role', role || 'unknown');
    return response;

  } catch (error: any) {
    console.error('[MIDDLEWARE_ERROR] Invalid token or session expired. Redirecting to login.', {
      pathname,
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

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|placeholders|media).*)',
  ],
};
