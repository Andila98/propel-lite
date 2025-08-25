
import { NextResponse, type NextRequest } from 'next/server';
import { firestore } from '@/lib/firebase-admin';
import { toJSON } from '@/lib/utils';

export const runtime = 'nodejs';

// GET /api/tenants/{tenantId}/payments
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tenantId = params.id;
    
    const paymentsSnapshot = await firestore.collection('payments')
      .where('tenantId', '==', tenantId)
      .orderBy('date', 'desc')
      .get();
      
    const payments = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json(toJSON(payments));
  } catch (error: any) {
    console.error(`[API_TENANT_PAYMENTS_GET_ERROR]`, error);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}
