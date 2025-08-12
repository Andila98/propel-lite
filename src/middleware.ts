
import { NextRequest, NextResponse } from 'next/server';
import { getTokens } from 'next-firebase-auth-edge';
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
  const tokens = await getTokens(request, authConfig);

  // If no valid tokens are found, redirect to the login page
  if (!tokens) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    console.log(`Redirecting unauthenticated user from ${pathname} to /login`);
    return NextResponse.redirect(url);
  }

  // Role-based redirect: if a tenant accesses the root, send them to their portal
  if (pathname === '/' && tokens.decodedToken.role === 'tenant') {
    return NextResponse.redirect(new URL('/tenant-portal', request.url));
  }
  
  // If the user is authenticated and the path is not a special case, allow the request
  return NextResponse.next();
}

// Configure the middleware to run on all paths except for the defined static asset paths
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|placeholders|media).*)',
  ],
};
