
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
    
    // Explicitly handle the case where the session is invalid or expired.
    if (!claims) {
      const response = NextResponse.json({ error: 'Unauthorized: Invalid or expired session.' }, { status: 401 });
      // Instruct the browser to clear the invalid cookie.
      response.cookies.delete(authConfig.cookieName);
      return response;
    }

    // If claims exist, proceed to fetch the full user profile.
    const userProfile = await getUserProfile(claims.uid);
    
    if (!userProfile) {
        return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });
    }
    
    return NextResponse.json(toJSON(userProfile), { status: 200 });
    
  } catch (error: any) {
    console.error('[ERROR: /api/auth/me]', error);
    // This will catch any unexpected errors during profile fetching or other operations.
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}
