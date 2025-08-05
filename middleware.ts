
import { NextRequest, NextResponse } from 'next/server';
import { getTokens } from 'next-firebase-auth-edge';
import { authConfig } from './config/server-config';

export async function middleware(req: NextRequest) {
  const { nextUrl } = req;
  
  const tokens = await getTokens(req.cookies, {
      cookieName: authConfig.cookieName,
      cookieSignatureKeys: authConfig.cookieSignatureKeys,
  });

  // If the request is for an API route and there are no tokens, return 401
  if (nextUrl.pathname.startsWith('/api/') && !tokens) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const publicPaths = ['/login', '/onboarding', '/register'];
  if (publicPaths.some(path => nextUrl.pathname.startsWith(path))) {
    return NextResponse.next();
  }
  
  if (!tokens) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url);
  }
  
  const role = tokens.decodedToken.role;
  const pathname = nextUrl.pathname;

  // 🔐 Role-based route protection
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
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
