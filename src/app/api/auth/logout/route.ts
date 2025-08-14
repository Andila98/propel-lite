
import { type NextRequest, NextResponse } from 'next/server';
import { authConfig } from '@/config/server-config';
import { admin } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get(authConfig.cookieName)?.value;

  if (sessionCookie) {
    try {
      const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie);
      await admin.auth().revokeRefreshTokens(decodedClaims.uid);
      console.log(`[LOGOUT_SUCCESS] Revoked refresh tokens for UID: ${decodedClaims.uid}`);
    } catch (error: any) {
      console.error('[LOGOUT_ERROR] Failed to revoke refresh tokens:', {
        message: error.message,
        code: error.code
      });
    }
  }

  // Always attempt to clear the cookie.
  const response = NextResponse.json({ success: true }, { status: 200 });
  
  response.cookies.set({
    name: authConfig.cookieName,
    value: '',
    path: '/',
    maxAge: -1,
  });

  return response;
}
