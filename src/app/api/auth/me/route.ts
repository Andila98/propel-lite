
import { type NextRequest, NextResponse } from 'next/server';
import { isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { verifySession } from '@/lib/auth-utils';
import { getUserProfile } from '@/lib/auth-service';
import { toJSON } from '@/lib/utils';
import { authConfig } from '@/config/server-config';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  if (!isFirebaseAdminInitialized) {
    return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 503 });
  }

  try {
    const claims = await verifySession(req);
    
    if (!claims) {
      // If the session is invalid or expired, send a 401 Unauthorized response
      // and explicitly clear the cookie on the client side.
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      response.cookies.delete(authConfig.cookieName);
      return response;
    }

    const userProfile = await getUserProfile(claims.uid);
    
    if (!userProfile) {
        return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });
    }
    
    return NextResponse.json(toJSON(userProfile), { status: 200 });
    
  } catch (error: any) {
    console.error('[ERROR: /api/auth/me]', error);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}
