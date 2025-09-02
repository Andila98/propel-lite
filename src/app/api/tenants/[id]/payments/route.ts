
import { NextResponse, type NextRequest } from 'next/server';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { toJSON } from '@/lib/utils';
import { getLandlordAndActor } from '@/lib/auth-utils';

export const runtime = 'nodejs';

// GET /api/tenants/{tenantId}/payments
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isFirebaseAdminInitialized) {
    return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 500 });
  }
  const { landlordId, error: authError } = await getLandlordAndActor(req);
  if (authError || !landlordId) {
      return NextResponse.json({ error: authError?.message || 'Unauthorized' }, { status: authError?.statusCode || 401 });
  }

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
