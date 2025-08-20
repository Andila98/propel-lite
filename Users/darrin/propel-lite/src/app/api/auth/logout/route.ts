
import { type NextRequest, NextResponse } from 'next/server';
import { authConfig } from '@/config/server-config';
import { serialize } from 'cookie';
import { auth, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  const sessionCookie = cookies().get(authConfig.cookieName)?.value;

  if (sessionCookie && isFirebaseAdminInitialized) {
      try {
          const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
          await auth.revokeRefreshTokens(decodedClaims.sub);
      } catch (error: any) {
          // Ignore errors if the cookie is already invalid.
          if (error.code !== 'auth/session-cookie-revoked' && error.code !== 'auth/id-token-revoked') {
          }
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
