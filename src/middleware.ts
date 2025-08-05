
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  // In a real implementation, you would add your token verification logic here.
  // The `verifyFirebaseToken` utility is available in `src/lib/utils.ts`.
  //
  // Example:
  // try {
  //   const claims = await verifyFirebaseToken(request);
  //   console.log("Middleware: Token verified for user:", claims.userId);
  //   // Add claims to request headers for use in server components/API routes
  //   const headers = new Headers(request.headers);
  //   headers.set('x-user-id', claims.userId);
  //   headers.set('x-user-role', claims.role);
  //   return NextResponse.next({ request: { headers } });
  // } catch (error) {
  //   console.error("Middleware: Authentication error", error);
  //   return NextResponse.redirect(new URL('/login', request.url));
  // }
  
  console.log("Middleware executing for path:", request.nextUrl.pathname);

  // For now, we'll just let the request pass through.
  return NextResponse.next()
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (login page)
     * - onboarding (onboarding flow)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|login|onboarding).*)',
  ],
}
