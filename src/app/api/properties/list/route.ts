
import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyFirebaseToken } from '@/lib/server-utils';

export async function GET(req: NextRequest) {
  try {
    const { userId, role } = await verifyFirebaseToken(req);

    if (role !== 'landlord') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const snapshot = await db
      .collection('properties')
      .where('landlordId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    if (snapshot.empty) {
        return NextResponse.json([]);
    }

    const properties = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    }));

    return NextResponse.json(properties);
  } catch (error: any) {
    console.error('[PROPERTY_LIST_ERROR]', error);
    if (error.message.includes('No auth token provided')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
