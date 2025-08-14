import { type NextRequest, NextResponse } from 'next/server';
import { getTokens, removeAuthCookies } from 'next-firebase-auth-edge';
import { authConfig } from '@/config/server-config';
import { getAuth } from 'firebase-admin/auth';
import type { Tokens } from 'next-firebase-auth-edge';

export async function POST(request: NextRequest) {
  try {
    const tokens: Tokens | null = await getTokens(request, authConfig);
    if (tokens) {
      // Invalidate the session by revoking the refresh token.
      await getAuth().revokeRefreshTokens(tokens.decodedToken.uid);
      console.log(`[LOGOUT_SUCCESS] Revoked refresh tokens for UID: ${tokens.decodedToken.uid}`);
    }
  } catch (error: any) {
    // Log the error but don't prevent logout.
    // The main goal is to clear the client-side cookie.
    console.error('[LOGOUT_ERROR] Failed to revoke refresh tokens:', {
      message: error.message,
      code: error.code
    });
  }

  // Always attempt to clear the cookie.
  const response = NextResponse.json({ success: true }, { status: 200 });
  
  await removeAuthCookies(request, { response, ...authConfig });

  return response;
}