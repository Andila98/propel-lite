
import { type NextRequest, NextResponse } from 'next/server';
import { getTokens } from 'next-firebase-auth-edge';
import { authConfig } from '@/config/server-config';
import { getAuth } from 'firebase-admin/auth';

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
    
    // Get user's role from custom claims
    const user = await getAuth().getUser(tokens.localId);
    const role = user.customClaims?.role || 'tenant'; // Default to tenant if no role

    const responseWithCookie = new NextResponse(JSON.stringify({ success: true, role }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    await getTokens(tokens, {
      user,
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
