
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  // In a real implementation, you would add your token verification logic here.
  // 1. Get the token from the Authorization header.
  // 2. Call your verifyFirebaseToken() utility.
  // 3. If the token is invalid, redirect to the login page.
  // 4. If the token is valid, you can add the decoded user info to the request headers
  //    to be accessed in API routes or server components.
  
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
