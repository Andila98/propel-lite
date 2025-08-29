
import { type NextRequest, NextResponse } from 'next/server';
import { isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { verifySession } from '@/lib/auth-utils';
import { getUserProfile } from '@/lib/auth-service';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  if (!isFirebaseAdminInitialized) {
    // Return a 503 Service Unavailable if the backend is not ready,
    // but only after confirming there is an attempt to authenticate.
    const sessionCookie = req.cookies.get('PropelAuth')?.value;
    if (sessionCookie) {
        return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 503 });
    }
    // If no cookie, it's just an unauthenticated request.
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let decodedToken;

  try {
    decodedToken = await verifySession(req);
    
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userProfile = await getUserProfile(decodedToken.uid);
    
    if (!userProfile) {
        return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });
    }
    
    return NextResponse.json(userProfile, { status: 200 });
    
  } catch (error) {
    console.error('[ERROR: /api/auth/me]', error);
    return NextResponse.json({ error: 'Unauthorized: Invalid token or session.' }, { status: 401 });
  }
}
