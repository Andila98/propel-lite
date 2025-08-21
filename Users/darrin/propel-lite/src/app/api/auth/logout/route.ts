
import { type NextRequest, NextResponse } from 'next/server';
import { authConfig } from '@/config/server-config';
import { serialize } from 'cookie';
import { auth, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  const sessionCookie = cookies().get(authConfig.cookieName)?.value;

  if (sessionCookie && isFirebaseAdminInitialized) {
      try {
          // Optional: Revoke the session cookie for immediate invalidation.
          const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
          await auth.revokeRefreshTokens(decodedClaims.sub);
      } catch (error) {
          // Ignore errors if the cookie is already invalid.
          console.log("[API_LOGOUT] Could not revoke refresh token, session might be expired.", error);
      }
  }

  // Expire the cookie by setting maxAge to 0
  const expiredCookie = serialize(authConfig.cookieName, '', {
    ...authConfig.cookieSerializeOptions,
    maxAge: 0,
  });

  const response = NextResponse.json({ success: true }, { status: 200 });
  response.headers.set('Set-Cookie', expiredCookie);
  return response;
}
