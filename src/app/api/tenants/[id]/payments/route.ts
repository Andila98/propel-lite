
import { NextResponse, type NextRequest } from 'next/server';
import { firestore } from '@/lib/firebase-admin';
import { toJSON } from '@/lib/utils';
import { verifySession } from '@/lib/auth-utils';

export const runtime = 'nodejs';

// GET /api/tenants/{tenantId}/payments
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const claims = await verifySession(req);
  if (!claims) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const landlordId = claims.role === 'manager' ? claims.landlordId : claims.uid;

  try {
    const tenantId = params.id;
    const tenantDoc = await firestore.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists || tenantDoc.data()?.landlordId !== landlordId) {
        return NextResponse.json({ error: 'Tenant not found or access denied.' }, { status: 404 });
    }
    
    const paymentsSnapshot = await firestore.collection('payments')
      .where('tenantId', '==', tenantId)
      .orderBy('date', 'desc')
      .get();
      
    const payments = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json(toJSON(payments));
  } catch (error: any) {
    console.error(`[ERROR: /api/tenants/{id}/payments GET]`, error);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}
