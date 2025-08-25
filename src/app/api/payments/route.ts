
import { NextResponse, type NextRequest } from 'next/server';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { toJSON } from '@/lib/utils';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    if (!isFirebaseAdminInitialized) {
        return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 500 });
    }
    try {
        const paymentsSnapshot = await firestore.collection('payments').orderBy('date', 'desc').get();
        const payments = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        return NextResponse.json(toJSON(payments));
    } catch (error: any) {
      console.error('[API_PAYMENTS_GET_ERROR]', error);
      return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
