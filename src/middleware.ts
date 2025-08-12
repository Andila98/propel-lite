
import { NextRequest, NextResponse } from 'next/server';
import { getTokens } from 'next-firebase-auth-edge';
import { authConfig } from './config/server-config';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const publicPaths = [
    '/login',
    '/register',
    '/onboarding',
    '/api/auth/login',
    '/api/auth/signup',
    '/api/auth/accept-invite',
    '/api/webhooks/mpesa',
    '/api/webhooks/stripe',
    // Allow public access to static assets and image optimization
    '/_next/static',
    '/_next/image',
    '/favicon.ico',
    '/placeholders',
    '/media'
  ];

  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  if (isPublicPath) {
    return NextResponse.next();
  }

  const tokens = await getTokens(request, {
    ...authConfig,
  });

  if (!tokens) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    console.log(`Redirecting unauthenticated user from ${pathname} to /login`);
    return NextResponse.redirect(url);
  }

  // If a tenant tries to access the root, redirect them to their portal
  if (pathname === '/' && tokens.decodedToken.role === 'tenant') {
    return NextResponse.redirect(new URL('/tenant-portal', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|placeholders|media).*)',
  ],
};
