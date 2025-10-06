import { type NextRequest, NextResponse } from 'next/server';
import { isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { verifySession } from '@/lib/auth-utils';
import { getUserProfile } from '@/lib/auth-service';
import { toJSON } from '@/lib/utils';
import { authConfig } from '@/config/server-config';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  if (!isFirebaseAdminInitialized) {
    console.error('[ERROR: /api/auth/me] Firebase Admin not initialized');
    return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 503 });
  }

  try {
    const sessionCookie = req.cookies.get(authConfig.cookieName)?.value;
    
    // Add logging for debugging
    console.log('[INFO: /api/auth/me] Session cookie present:', !!sessionCookie);
    
    const claims = await verifySession(sessionCookie);
    
    if (!claims) {
      console.log('[INFO: /api/auth/me] No valid claims found');
      const response = NextResponse.json({ error: 'Unauthorized: Invalid or expired session.' }, { status: 401 });
      response.cookies.delete(authConfig.cookieName);
      return response;
    }
    
    console.log('[INFO: /api/auth/me] Fetching profile for uid:', claims.uid);
    const userProfile = await getUserProfile(claims.uid);
    
    if (!userProfile) {
      console.error('[ERROR: /api/auth/me] User profile not found for uid:', claims.uid);
      return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });
    }
    
    return NextResponse.json(toJSON(userProfile), { status: 200 });
    
  } catch (error: unknown) {
    const typedError = error as Error & { code?: string };
    console.error('[ERROR: /api/auth/me]', {
      message: typedError.message,
      code: typedError.code,
      stack: typedError.stack
    });
    
    // Return more specific errors based on the failure
    if (typedError.code?.startsWith('auth/')) {
      return NextResponse.json({ error: 'Session verification failed.' }, { status: 401 });
    }
    
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}
