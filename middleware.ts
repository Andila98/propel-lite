
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define which routes are public and which are protected
const publicRoutes = ['/login', '/onboarding', '/api/auth/login', '/api/auth/signup', '/api/auth/accept-invite'];
const landlordRoutes = ['/']; // Add all landlord-specific routes here, assuming '/' is the dashboard
const tenantRoutes = ['/tenant-portal'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get('__session')?.value;

  // Check if the route is public
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // If no session token and not a public route, redirect to login
  if (!sessionToken) {
    console.log(`[Middleware] No session token found for path: ${pathname}. Redirecting to login.`);
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verify the token by calling the backend /me endpoint
  try {
    const response = await fetch(new URL('/api/auth/me', request.url), {
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
      },
    });

    if (!response.ok) {
        // If token is invalid (e.g., expired), clear the cookie and redirect to login
        console.log(`[Middleware] Invalid session token for path: ${pathname}. Redirecting to login.`);
        const res = NextResponse.redirect(new URL('/login', request.url));
        res.cookies.set('__session', '', { maxAge: -1 }); // Clear the cookie
        return res;
    }

    const { role } = await response.json();

    // Role-based route protection
    if (landlordRoutes.some(route => pathname.startsWith(route)) && role !== 'landlord') {
        console.log(`[Middleware] Role '${role}' trying to access landlord route: ${pathname}. Redirecting.`);
        return NextResponse.redirect(new URL('/tenant-portal', request.url)); // Redirect tenants away from landlord pages
    }

    if (tenantRoutes.some(route => pathname.startsWith(route)) && role !== 'tenant') {
        console.log(`[Middleware] Role '${role}' trying to access tenant route: ${pathname}. Redirecting.`);
        return NextResponse.redirect(new URL('/', request.url)); // Redirect landlords away from tenant pages
    }
    
    // If all checks pass, allow the request to proceed
    return NextResponse.next();

  } catch (error) {
    console.error('[Middleware Error]', error);
    // On any error, redirect to login for safety
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - media/ (uploaded media files)
     */
    '/((?!_next/static|_next/image|favicon.ico|media).*)',
  ],
};
