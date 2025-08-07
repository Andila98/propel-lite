
import { type NextRequest, NextResponse } from 'next/server';
import { getTokens } from 'next-firebase-auth-edge/lib/next/tokens';
import { 
    apiKey, 
    cookieSignatureKeys, 
    cookieSerializeOptions, 
    serviceAccount 
} from '@/config/server-config';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    // The getTokens function handles verifying the token, fetching custom claims,
    // and generating the session cookie.
    const tokens = await getTokens(idToken, {
      serviceAccount,
      apiKey,
      cookieName: '__session',
      cookieSignatureKeys,
      cookieSerializeOptions,
    });

    const response = NextResponse.json({
        success: true,
        role: tokens.decodedToken.role
    }, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    // Set the secure, HTTP-only session cookie on the browser
    response.cookies.set(tokens.cookie);

    return response;

  } catch (error: any) {
    console.error("Login API Error:", error);
    // Provide a more specific error message if available
    const message = error.message || 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
