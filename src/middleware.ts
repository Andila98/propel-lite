
import { NextRequest, NextResponse } from 'next/server';
import { authConfig } from './config/server-config';
import { loginRateLimit } from './lib/rate-limiter';

// Runtime configuration
export const runtime = 'edge';

// Security headers to apply to all responses
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
} as const;

// Enhanced path configuration
const pathConfig = {
  // Paths that don't require authentication
  public: [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
  ],
  // Auth API routes (always public)
  authApi: ['/api/auth'],
  // Static assets and Next.js internals
  static: ['/_next', '/favicon.ico', '/robots.txt', '/sitemap.xml'],
  // File extensions for static assets
  staticExtensions: /\.(png|jpg|jpeg|gif|svg|ico|webp|css|js|woff|woff2|ttf|eot)$/,
  // Special handling for onboarding
  onboarding: ['/onboarding'],
  // Admin-only paths
  admin: ['/admin'],
} as const;


// Helper functions
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return realIP || request.ip || 'unknown';
}

function isPublicPath(pathname: string): boolean {
  // Static assets and Next.js internals
  if (pathConfig.static.some(path => pathname.startsWith(path)) || 
      pathConfig.staticExtensions.test(pathname)) {
    return true;
  }

  // Allow test DB route in development
  if (process.env.NODE_ENV === 'development' && pathname === '/api/test-db') {
    return true;
  }

  // Auth API routes
  if (pathConfig.authApi.some(path => pathname.startsWith(path))) {
    return true;
  }

  // Public pages
  if (pathConfig.public.includes(pathname)) {
    return true;
  }

  // Special case for invite acceptance
  if (pathname.startsWith('/onboarding/accept-invite')) {
    return true;
  }

  return false;
}

function isOnboardingPath(pathname: string): boolean {
  return pathConfig.onboarding.some(path => pathname.startsWith(path));
}

function isAdminPath(pathname: string): boolean {
  return pathConfig.admin.some(path => pathname.startsWith(path));
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

function createRedirectResponse(request: NextRequest, destination: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = destination;
  
  // Preserve the original path for redirect after login (except for root)
  if (request.nextUrl.pathname !== '/') {
    url.searchParams.set('redirect', request.nextUrl.pathname);
  }
  
  const response = NextResponse.redirect(url);
  return addSecurityHeaders(response);
}

function createErrorResponse(message: string, status: number): NextResponse {
  const response = NextResponse.json(
    { 
      error: message,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
  return addSecurityHeaders(response);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIP(request);

  // Apply rate limiting for non-static requests
  if (!pathConfig.staticExtensions.test(pathname) && 
      !pathname.startsWith('/_next')) {
    
    try {
        await loginRateLimit.check(request);
    } catch(error) {
      console.warn(`[Middleware] Rate limit exceeded for IP: ${ip}, path: ${pathname}`);
      
      if (pathname.startsWith('/api/')) {
        return createErrorResponse('Too many requests. Please try again later.', 429);
      }
      
      return createRedirectResponse(request, '/login?error=rate-limit');
    }
  }

  // Allow public paths
  if (isPublicPath(pathname)) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Check for session cookie
  const sessionCookie = request.cookies.get(authConfig.cookieName)?.value;

  if (!sessionCookie) {
    console.info(`[Middleware] No session cookie found for ${pathname}`);
    
    if (pathname.startsWith('/api/')) {
      return createErrorResponse('Authentication required', 401);
    }
    
    return createRedirectResponse(request, '/login');
  }

  // For Edge runtime, we can't decode JWT easily, so we just check cookie presence
  // The actual verification happens in API routes or server components
  
  // Special handling for admin paths (you'd need to verify admin role in API)
  if (isAdminPath(pathname)) {
    // This would need server-side role verification
    // For now, just ensure they have a session cookie
    console.info(`[Middleware] Admin path access attempted: ${pathname}`);
  }

  // Log access for monitoring
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/me')) {
    console.debug(`[Middleware] API access: ${request.method} ${pathname} by ${ip}`);
  }

  // Add security headers and continue
  return addSecurityHeaders(NextResponse.next());
}

// Enhanced matcher configuration
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, robots.txt, sitemap.xml (common static files)
     * - placeholders, media (custom static directories)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|placeholders|media).*)',
  ],
};
