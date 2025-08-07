
import { NextRequest, NextResponse } from 'next/server';
import { getTokens } from 'next-firebase-auth-edge';
import { authConfig } from './config/server-config';

const AUTH_COOKIE_NAME = '__session';

export async function middleware(req: NextRequest) {
  const { nextUrl } = req;
  
  const tokens = await getTokens(req.cookies, {
      cookieName: authConfig.cookieName,
      cookieSignatureKeys: authConfig.cookieSignatureKeys,
      serviceAccount: authConfig.serviceAccount,
      apiKey: authConfig.apiKey,
  });

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
