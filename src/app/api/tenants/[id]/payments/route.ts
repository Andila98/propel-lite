
import { NextResponse, type NextRequest } from 'next/server';
import { firestore } from '@/lib/firebase-admin';
import type { Tenant } from 'src/services/tenant-service';
import { verifyApiAuth } from '@/lib/server-utils';
import type { DecodedIdToken } from 'firebase-admin/auth';

export const runtime = 'nodejs';

// GET /api/tenants/[id]/payments
// Fetches all payments for a specific tenant.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const { id: tenantId } = params;
    
    try {
      const { decodedToken, error } = await verifyApiAuth(req, ['landlord', 'manager', 'tenant']);
      if (error) return error;

      const tenantDoc = await firestore.collection('users').doc(tenantId).get();
      if (!tenantDoc.exists) {
        return NextResponse.json({ error: 'Tenant not found.' }, { status: 404 });
      }

      const tenantData = tenantDoc.data() as Tenant;
      const landlordId = tenantData.landlordId;

      // Authorization Check
      const { uid, role, landlordId: managerLandlordId } = decodedToken as DecodedIdToken & { role?: string, landlordId?: string };
      const isSelf = role === 'tenant' && uid === tenantId;
      const isOwner = role === 'landlord' && uid === landlordId;
      const isManagerForLandlord = role === 'manager' && managerLandlordId === landlordId;

      if (!isSelf && !isOwner && !isManagerForLandlord) {
        return NextResponse.json({ error: 'Forbidden: You do not have permission to view these payments.' }, { status: 403 });
      }

      const paymentsSnapshot = await firestore.collection('payments')
        .where('tenantId', '==', tenantId)
        .orderBy('paidAt', 'desc')
        .get();

      const payments = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      return NextResponse.json(payments, { status: 200 });

    } catch (error: any) {
      console.error(`[API_TENANT_PAYMENTS_GET_ERROR] Failed to fetch payments for tenant ${tenantId}:`, error);
      return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
