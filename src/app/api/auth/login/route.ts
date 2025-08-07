
import { type NextRequest, NextResponse } from 'next/server';
import { getTokens } from 'next-firebase-auth-edge';
import { authConfig } from '@/config/server-config';
import { getAuth } from 'firebase-admin/auth';
import type { DecodedIdToken } from 'firebase-admin/auth';

export async function POST(request: NextRequest) {
  const { idToken } = await request.json();

  try {
    // The library will verify the token and get the user from it.
    const user = await getAuth().verifyIdToken(idToken);
    
    const responseWithCookie = new NextResponse(JSON.stringify({ success: true, role: user.role }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    // The getTokens function from next-firebase-auth-edge will handle refreshing the token
    // if necessary and setting the secure, httpOnly session cookie.
    await getTokens(idToken, {
      user, // Pass the decoded user token
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
