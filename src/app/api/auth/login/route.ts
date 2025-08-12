
import { type NextRequest, NextResponse } from 'next/server';
import { getTokens } from 'next-firebase-auth-edge';
import { authConfig } from '@/config/server-config';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    const tokens = await getTokens(request, {
      idToken,
      ...authConfig,
    });

    const response = NextResponse.json({
        success: true,
        role: tokens.decodedToken.role
    }, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    response.cookies.set(
      authConfig.cookieName,
      tokens.token,
      authConfig.cookieSerializeOptions
    );

    return response;

  } catch (error: any) {
    console.error("[LOGIN_ERROR]", error);
    const message = error.message || 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
