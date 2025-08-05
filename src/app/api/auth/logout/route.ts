
import { type NextRequest, NextResponse } from 'next/server';
import { authConfig } from '@/config/server-config';

export async function POST(request: NextRequest) {
  const response = new NextResponse(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

  // Clear the session cookie by setting its Max-Age to 0
  response.cookies.set({
    name: authConfig.cookieName,
    value: '',
    httpOnly: true,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
  });

  return response;
}
