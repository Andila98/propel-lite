
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // This is a placeholder middleware.
  // All routes are currently public.
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|placeholders|media).*)',
  ],
};
