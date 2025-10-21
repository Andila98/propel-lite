
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Mock middleware, does nothing.
  return NextResponse.next();
}

export const config = {
  matcher: '/:path*',
};
