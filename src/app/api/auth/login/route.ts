
import { type NextRequest, NextResponse } from 'next/server';
import { getTokens } from 'next-firebase-auth-edge';
import { authConfig } from '@/config/server-config';

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${authConfig.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      }
    );

    const tokens = await response.json();
    if (!response.ok) {
      console.error("Firebase Auth Error:", tokens.error.message);
      return NextResponse.json(
        { error: 'Invalid credentials. Please try again.' },
        { status: 401 }
      );
    }

    const responseWithCookie = new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    await getTokens(tokens, {
      user: tokens,
      serviceAccount: authConfig.serviceAccount,
      apiKey: authConfig.apiKey,
      cookieName: authConfig.cookieName,
      cookieSignatureKeys: authConfig.cookieSignatureKeys,
      cookieSerializeOptions: authConfig.cookieSerializeOptions,
      handleInvalidToken: async () => {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      },
    }).then((tokens) => tokens.setCookies(responseWithCookie));
    
    return responseWithCookie;
  } catch (error) {
    console.error("Login API Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
