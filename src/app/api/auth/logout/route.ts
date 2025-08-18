
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // This is a mock implementation since Firebase is removed.
  const response = NextResponse.json({ success: true }, { status: 200 });
  
  // Clear any potential mock session cookie
  response.cookies.set({
    name: 'PropelAuth', // Example cookie name
    value: '',
    path: '/',
    maxAge: -1,
  });

  return response;
}
