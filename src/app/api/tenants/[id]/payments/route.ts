
import { NextResponse, type NextRequest } from 'next/server';
import { firestore } from '@/lib/firebase-admin';
import { Payment } from '@/lib/types';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const { id: tenantId } = params;
    
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
              date: (data.date as any)?.toDate ? (data.date as any).toDate().toISOString() : data.date,
          } as Payment;
      });

      return NextResponse.json(payments, { status: 200 });

    } catch (error: any) {
      console.error(`[API_TENANT_PAYMENTS_GET_ERROR] Failed to fetch payments for tenant ${tenantId}:`, error);
      return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
