
import { type NextRequest, NextResponse } from 'next/server';
import { authConfig } from '@/config/server-config';
import { auth, isFirebaseAdminInitialized } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

/**
 * Handles the user logout process.
 * 1. Verifies the session cookie from the request.
 * 2. If valid, revokes all refresh tokens for the user to invalidate the session.
 * 3. Clears the session cookie from the browser.
 */
export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get(authConfig.cookieName)?.value;

  if (isFirebaseAdminInitialized && sessionCookie) {
    try {
      const decodedClaims = await auth.verifySessionCookie(sessionCookie);
      await auth.revokeRefreshTokens(decodedClaims.uid);
      console.log(`[LOGOUT_SUCCESS] Revoked refresh tokens for UID: ${decodedClaims.uid}`);
    } catch (error: any) {
      // This error is common if the cookie is expired, so we don't need to log it as a server error.
      console.log(`[LOGOUT_INFO] Could not revoke refresh tokens, likely because session cookie was already invalid: ${error.code}`);
    }
  }

  // Always attempt to clear the cookie, even if revoke failed or SDK isn't initialized.
  const response = NextResponse.json({ success: true }, { status: 200 });
  
  response.cookies.set({
    name: authConfig.cookieName,
    value: '',
    path: '/',
    maxAge: -1, // Expire the cookie immediately
  });

  return response;
}
