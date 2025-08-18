
import { type NextRequest, NextResponse } from 'next/server';
import { authConfig } from '@/config/server-config';
import { isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { verifyApiAuth } from '@/lib/server-utils';
import { authService } from '@/services/auth-service';

/**
 * Handles the user logout process.
 * 1. Verifies the session cookie from the request.
 * 2. If valid, delegates to AuthService to revoke all refresh tokens for the user.
 * 3. Clears the session cookie from the browser.
 */
export async function POST(request: NextRequest) {
  if (!isFirebaseAdminInitialized) {
     // Even if Firebase isn't set up, we should still clear the cookie.
     console.warn('[LOGOUT_WARN] Firebase not configured, but proceeding to clear client cookie.');
  } else {
    const { decodedToken } = await verifyApiAuth(request);
    
    if (decodedToken) {
      try {
        await authService.revokeSession(decodedToken.uid);
      } catch (error: any) {
        // This error is common if the cookie is expired, so we don't need to log it as a server error.
        console.log(`[LOGOUT_INFO] Could not revoke refresh tokens, likely because session cookie was already invalid: ${error.code}`);
      }
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
