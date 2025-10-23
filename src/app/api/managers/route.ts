
import { NextResponse, type NextRequest } from 'next/server';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { getLandlordId } from '@/lib/auth-utils';
import { toJSON } from '@/lib/utils';
import { authConfig } from '@/config/server-config';
import type { DocumentData } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    if (!isFirebaseAdminInitialized) {
        return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 500 });
    }
    const sessionCookie = req.cookies.get(authConfig.cookieName)?.value;
    const landlordId = await getLandlordId(sessionCookie);
    if (!landlordId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const managersSnapshot = await firestore.collection('managers').where('landlordId', '==', landlordId).get();
        const managers = managersSnapshot.docs.map((doc: DocumentData) => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json(toJSON(managers), { status: 200 });
    } catch (error: unknown) {
      console.error('[ERROR: /api/managers GET]', error);
      return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}
