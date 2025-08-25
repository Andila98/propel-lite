

import { NextResponse, type NextRequest } from 'next/server';
import { firestore, auth } from '@/lib/firebase-admin';
import { toJSON } from '@/lib/utils';


export async function GET(req: NextRequest) {
    try {
        const tenantsSnapshot = await firestore.collection('tenants').get();
        const tenants = tenantsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json(toJSON(tenants), { status: 200 });
    } catch (error: any) {
      console.error('[API_TENANTS_GET_ERROR] Failed to list tenants:', error);
      return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
