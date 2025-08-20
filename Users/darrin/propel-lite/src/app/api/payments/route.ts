
import { type NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase-admin';
import type { Payment } from '@/lib/types';

export async function GET(req: NextRequest) {
    try {
        const paymentsSnapshot = await firestore.collection('payments').orderBy('date', 'desc').get();
        const payments = paymentsSnapshot.docs.map(doc => {
            const data = doc.data();
            return { 
                id: doc.id, 
                ...data,
                date: (data.date as any)?.toDate ? (data.date as any).toDate().toISOString() : data.date,
            } as Payment;
        });

        return NextResponse.json(payments, { status: 200 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
