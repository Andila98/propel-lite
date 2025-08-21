
import { NextResponse, type NextRequest } from 'next/server';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { Payment } from '@/lib/types';
import { toISOString } from '@/lib/utils';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const { id: tenantId } = params;

    if (!isFirebaseAdminInitialized) {
        console.error('[API_TENANT_PAYMENTS] Firebase Admin is not initialized.');
        return NextResponse.json({ error: 'Firebase is not initialized. Please check server credentials.' }, { status: 500 });
    }
    
    try {
      const paymentsSnapshot = await firestore.collection('payments')
        .where('tenantId', '==', tenantId)
        .orderBy('date', 'desc')
        .get();
      
      const payments = paymentsSnapshot.docs.map(doc => {
          const data = doc.data();
          return { 
              id: doc.id, 
              ...data,
              // Convert Firestore Timestamp to ISO string for client
              date: toISOString(data.date),
          } as Payment;
      });

      return NextResponse.json(payments, { status: 200 });

    } catch (error: any) {
      console.error(`[API_TENANT_PAYMENTS_GET_ERROR] Failed to fetch payments for tenant ${tenantId}:`, error);
      return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
