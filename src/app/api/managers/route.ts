
import { NextResponse, type NextRequest } from 'next/server';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { verifySession } from '@/lib/auth-utils';
import { toJSON } from '@/lib/utils';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    if (!isFirebaseAdminInitialized) {
        return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 500 });
    }
    const claims = await verifySession(req);
    if (!claims) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const managersSnapshot = await firestore.collection('managers').get();
        const managers = managersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json(toJSON(managers), { status: 200 });
    } catch (error: any) {
      console.error('[ERROR: /api/managers GET]', error);
      return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}
