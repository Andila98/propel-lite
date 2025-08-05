
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-firebase-auth-edge';
import { authConfig } from './config/server-config';

export async function middleware(req: NextRequest) {
  const { nextUrl } = req;
  
  const publicPaths = ['/login', '/onboarding', '/register'];
  if (publicPaths.some(path => nextUrl.pathname.startsWith(path))) {
    return NextResponse.next();
  }
  
  const token = await getToken({ 
      req, 
      cookieName: authConfig.cookieName,
      serviceAccount: authConfig.serviceAccount,
      apiKey: authConfig.apiKey,
   });

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  
  const role = token?.claims?.role;
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
