
import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from './lib/auth-utils';

// Paths that do not require authentication
const publicPaths = [
  '/login',
  '/register',
  '/forgot-password',
  '/onboarding/accept-invite',
  '/api/auth', // Allow all auth API routes
];

// Paths restricted to specific roles
const landlordPaths = [
    '/dashboard',
    '/properties',
    '/tenants',
    '/payments',
    '/rent-schedule',
    '/maintenance',
    '/reports',
    '/property-managers',
    '/audit-log',
    '/price-suggestion',
    '/smart-messaging',
    '/reminders',
    '/settings',
    '/onboarding',
];
const tenantPaths = ['/tenant-portal'];


function isPublic(pathname: string): boolean {
  if (pathname === '/') return true; // The root page handles its own redirection
  return publicPaths.some(path => pathname.startsWith(path));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow public paths, static files, and images to pass through
  if (isPublic(pathname) || pathname.startsWith('/_next') || /\.(png|jpg|svg|ico)$/.test(pathname)) {
    return NextResponse.next();
  }

  // Verify the session for all other routes
  const decodedClaims = await verifySession(request);

  if (!decodedClaims) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  const { role } = decodedClaims;

  // If user is a landlord but tries to access tenant portal
  if ((role === 'landlord' || role === 'manager') && tenantPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // If user is a tenant but tries to access landlord/manager portal
  if (role === 'tenant' && landlordPaths.some(p => pathname.startsWith(p))) {
     return NextResponse.redirect(new URL('/tenant-portal', request.url));
  }

  return NextResponse.next();
}

// Match all paths except for specific asset folders.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|placeholders|media).*)',
  ],
};
