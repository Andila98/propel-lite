
import { type NextRequest, NextResponse } from 'next/server';
import { authConfig } from '@/config/server-config';
import { admin } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

/**
 * Handles the user logout process.
 * 1. Verifies the session cookie from the request.
 * 2. If valid, revokes all refresh tokens for the user to invalidate the session.
 * 3. Clears the session cookie from the browser.
 */
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
      // Do not re-throw error. The goal is to clear the cookie regardless.
    }
  }

  // Always attempt to clear the cookie.
  const response = NextResponse.json({ success: true }, { status: 200 });
  
  response.cookies.set({
    name: authConfig.cookieName,
    value: '',
    path: '/',
    maxAge: -1, // Expire the cookie immediately
  });

  return response;
}
