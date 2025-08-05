
import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyFirebaseToken } from '@/lib/server-utils';

export async function GET(req: NextRequest) {
  try {
    const { userId, role, landlordId } = await verifyFirebaseToken(req);

    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userProfile = userDoc.data();

    // Combine Firestore data with claims data for a complete profile
    const fullProfile = {
      ...userProfile,
      role: role, // Ensure the role from the token is authoritative
      landlordId: landlordId,
    };

    return NextResponse.json(fullProfile);
  } catch (error: any) {
    console.error('[ME_ENDPOINT_ERROR]', error);
    if (error.message.includes('No auth token provided') || error.message.includes('verifyIdToken')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
