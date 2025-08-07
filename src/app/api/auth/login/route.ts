
import { type NextRequest, NextResponse } from 'next/server';
import { getTokens } from 'next-firebase-auth-edge';
import { authConfig } from '@/config/server-config';
import { getAuth } from 'firebase-admin/auth';
import type { DecodedIdToken } from 'firebase-admin/auth';

export async function POST(request: NextRequest) {
  const { idToken } = await request.json();

  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    
    const responseWithCookie = new NextResponse(
        JSON.stringify({ success: true, role: decodedToken.role }), 
        {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }
    );

    await getTokens(idToken, {
      user: decodedToken, // Pass the decoded user token
      serviceAccount: authConfig.serviceAccount,
      apiKey: authConfig.apiKey,
      cookieName: authConfig.cookieName,
      cookieSignatureKeys: authConfig.cookieSignatureKeys,
      cookieSerializeOptions: authConfig.cookieSerializeOptions,
      handleInvalidToken: async () => {
        console.error("Login API Error: Invalid token provided.");
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      },
    }).then((tokens) => {
        tokens.setCookies(responseWithCookie)
    });
    
    return responseWithCookie;

  } catch (error) {
    console.error("Login API Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
