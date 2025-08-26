
import { NextResponse, type NextRequest } from 'next/server';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { toJSON } from '@/lib/utils';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    if (!isFirebaseAdminInitialized) {
        return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 500 });
    }
    try {
        const tenantsSnapshot = await firestore.collection('tenants').get();
        const tenants = tenantsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json(toJSON(tenants), { status: 200 });
    } catch (error: any) {
      console.error('[ERROR: /api/tenants GET]', error);
      return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}
