
import { type NextRequest, NextResponse } from 'next/server';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import type { Payment } from '@/lib/types';
import { toISOString } from '@/lib/utils';

export async function GET(req: NextRequest) {
    if (!isFirebaseAdminInitialized) {
        console.error('[API_PAYMENTS] Firebase Admin is not initialized.');
        return NextResponse.json({ error: 'Firebase is not initialized. Please check server credentials.' }, { status: 500 });
    }

    try {
        const paymentsSnapshot = await firestore.collection('payments').orderBy('date', 'desc').get();
        const payments = paymentsSnapshot.docs.map(doc => {
            const data = doc.data();
            return { 
                id: doc.id, 
                ...data,
                date: toISOString(data.date),
            } as Payment;
        });

        return NextResponse.json(payments, { status: 200 });

    } catch (error: any) {
        console.error(`[API_PAYMENTS_GET_ERROR]`, error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
