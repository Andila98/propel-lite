
import { NextRequest, NextResponse } from 'next/server';
import { getTokens } from 'next-firebase-auth-edge/lib/next/tokens';
import { authConfig } from './config/server-config';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Define paths that should be publicly accessible
  const publicPaths = [
    '/login',
    '/register',
    '/onboarding',
    '/api/auth/login',
    '/api/auth/signup',
    '/api/auth/accept-invite',
    '/api/webhooks/mpesa',
    '/api/webhooks/stripe',
  ];
  
  // Define paths for static assets that should also be public
  const staticAssetPaths = [
    '/_next/static',
    '/_next/image',
    '/favicon.ico',
    '/placeholders',
    '/media'
  ];

  const isPublicPath = publicPaths.some(path => pathname.startsWith(path)) || 
                       staticAssetPaths.some(path => pathname.startsWith(path));

  // If the path is public, allow the request to proceed
  if (isPublicPath) {
    return NextResponse.next();
  }

  // For all other paths, check for authentication
  try {
    if (process.env.NODE_ENV === 'development') {
        console.log(`[MIDDLEWARE] Checking auth for path: ${pathname}`);
    }
    const tokens = await getTokens(request, {
      ...authConfig,
      apiKey: authConfig.apiKey, 
    });

    // If no valid tokens are found, redirect to the login page
    if (!tokens) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
      console.log(`[MIDDLEWARE] Redirecting unauthenticated user from ${pathname} to /login`);
      return NextResponse.redirect(url);
    }
    
    if (process.env.NODE_ENV === 'development') {
        console.log(`[MIDDLEWARE] User ${tokens.decodedToken.email} authenticated with role: ${tokens.decodedToken.role}`);
    }


    // Role-based redirect: if a tenant accesses the root, send them to their portal
    if (pathname === '/' && tokens.decodedToken.role === 'tenant') {
       console.log(`[MIDDLEWARE] Redirecting tenant to /tenant-portal`);
      return NextResponse.redirect(new URL('/tenant-portal', request.url));
    }
    
    // If the user is authenticated and the path is not a special case, allow the request
    return NextResponse.next();

  } catch (error) {
    console.error('[MIDDLEWARE_ERROR]', `Error verifying tokens for path: ${pathname}`, error);
    
    // On token verification errors, redirect to login
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('error', 'session_invalid');
    return NextResponse.redirect(url);
  }
}

// Configure the middleware to run on all paths except for the defined static asset paths
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|placeholders|media).*)',
  ],
};
