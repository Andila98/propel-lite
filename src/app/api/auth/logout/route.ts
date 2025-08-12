
import { type NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getTokens } from 'next-firebase-auth-edge';
import { authConfig } from '@/config/server-config';

export async function POST(request: NextRequest) {
  try {
    // Get user's session to revoke their tokens
    const tokens = await getTokens(request, authConfig);

    if (tokens) {
      // Revoke the refresh tokens to invalidate the session on the server
      await getAuth().revokeRefreshTokens(tokens.decodedToken.uid);
      console.log(`[LOGOUT_SUCCESS] Revoked tokens for user: ${tokens.decodedToken.uid}`);
    }
  } catch (error: any) {
      // Log the error but don't prevent logout from proceeding
      console.error('[LOGOUT_REVOKE_ERROR]', error);
  }
  
  const response = new NextResponse(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

  // Clear the session cookie by setting its Max-Age to 0
  response.cookies.set({
    name: authConfig.cookieName,
    value: '',
    httpOnly: true,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
  });

  return response;
}
