
import { NextRequest, NextResponse } from 'next/server';
import { getTokens } from 'next-firebase-auth-edge';
import { authConfig } from './config/server-config';

export async function middleware(req: NextRequest) {
  const { nextUrl } = req;
  
  // Define public paths that do not require authentication
  const publicPaths = [
    '/login',
    '/register',
    '/onboarding',
    '/api/auth/login',
    '/api/auth/signup',
    '/api/auth/accept-invite',
    // Allow public access to static assets and image optimization
    '/_next/static',
    '/_next/image',
    '/favicon.ico',
    '/placeholders',
  ];

  const isPublicPath = publicPaths.some(path => nextUrl.pathname.startsWith(path));

  // If it's a public path, do nothing
  if (isPublicPath) {
    return NextResponse.next();
  }

  // For all other paths, check for authentication
  const tokens = await getTokens(req, authConfig);

  // If no token, redirect to login for any protected page
  if (!tokens) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    console.log(`Redirecting unauthenticated user from ${nextUrl.pathname} to /login`);
    return NextResponse.redirect(url);
  }
  
  // If authenticated, check for role-based redirects
  const role = tokens.decodedToken.role;
  const pathname = nextUrl.pathname;

  // If a tenant tries to access the root, redirect them to their portal
  if (pathname === '/' && role === 'tenant') {
    return NextResponse.redirect(new URL('/tenant-portal', req.url));
  }

  return NextResponse.next();
}

// Configure the matcher to run middleware on all paths except for specific static files.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|placeholders).*)',
  ],
};
