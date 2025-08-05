
import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { withRole, type AuthenticatedRequest } from '@/lib/middleware/withRole';

export const GET = withRole(async (req: AuthenticatedRequest) => {
  try {
    const { uid: userId } = req.user;

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
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, ['landlord']);
