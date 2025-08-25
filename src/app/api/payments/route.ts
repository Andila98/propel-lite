
import { NextResponse, type NextRequest } from 'next/server';
import { firestore } from '@/lib/firebase-admin';
import { toJSON } from '@/lib/utils';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    try {
        const paymentsSnapshot = await firestore.collection('payments').orderBy('date', 'desc').get();
        const payments = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        return NextResponse.json(toJSON(payments));
    } catch (error: any) {
      console.error('[API_PAYMENTS_GET_ERROR]', error);
      return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
