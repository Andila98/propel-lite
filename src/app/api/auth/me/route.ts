
import { type NextRequest, NextResponse } from 'next/server';
import { isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { verifySession } from '@/lib/auth-utils';
import { getUserProfile } from '@/lib/auth-service';
import { toJSON } from '@/lib/utils';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  if (!isFirebaseAdminInitialized) {
    const sessionCookie = req.cookies.get('RentEaseAuth')?.value;
    if (sessionCookie) {
        return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 503 });
    }
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
    
    return NextResponse.json(toJSON(userProfile), { status: 200 });
    
  } catch (error: any) {
    console.error('[ERROR: /api/auth/me]', error);
    return NextResponse.json({ error: 'Internal Server Error: ' + error.message }, { status: 500 });
  }
}
