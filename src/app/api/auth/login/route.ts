
import { type NextRequest, NextResponse } from 'next/server';
import { getTokens } from 'next-firebase-auth-edge/lib/next/tokens';
import { authConfig } from '@/config/server-config';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    const { decodedToken, token, cookie } = await getTokens(request, {
      idToken,
      ...authConfig,
    });

    const response = NextResponse.json({
        success: true,
        role: decodedToken.role
    }, {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
       },
    });

    response.headers.set('Set-Cookie', cookie);

    return response;

  } catch (error: any) {
    console.error("[LOGIN_ERROR]", error);
    const message = error.message || 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
