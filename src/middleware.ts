
import { NextRequest, NextResponse } from 'next/server';
import { getTokens } from 'next-firebase-auth-edge';
import { authConfig } from './config/server-config';

export async function middleware(req: NextRequest) {
  const { nextUrl } = req;
  
  // Allow public access to auth-related API routes
  if (nextUrl.pathname.startsWith('/api/auth/login') || nextUrl.pathname.startsWith('/api/auth/signup')) {
      return NextResponse.next();
  }

  const tokens = await getTokens(req.cookies, {
      ...authConfig
  });

  // Protect all other API routes
  if (nextUrl.pathname.startsWith('/api/') && !tokens) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Allow public access to specific pages
  const publicPaths = ['/login', '/onboarding', '/register'];
  if (publicPaths.some(path => nextUrl.pathname.startsWith(path))) {
    return NextResponse.next();
  }
  
  // If no token, redirect to login for any other protected page
  if (!tokens) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url);
  }
  
  // Role-based redirects for authenticated users
  const role = tokens.decodedToken.role;
  const pathname = nextUrl.pathname;

  if (pathname.startsWith('/landlord') && role !== 'landlord') {
    return NextResponse.redirect(new URL('/tenant-portal', req.url));
  }

  if (pathname.startsWith('/manager') && role !== 'manager') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  if (pathname.startsWith('/tenant') && role !== 'tenant') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  if (pathname.startsWith('/superadmin') && role !== 'superadmin') {
    return NextResponse.redirect(new URL('/', req.url));
  }
  
  if (pathname === '/' && role === 'tenant') {
    return NextResponse.redirect(new URL('/tenant-portal', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
