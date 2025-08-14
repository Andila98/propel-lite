
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/firebase-admin';
import type { Tenant } from 'src/services/tenant-service';
import { verifyApiAuth } from '@/lib/server-utils';

export const runtime = 'nodejs';

// GET /api/tenants/[id]/payments
// Fetches all payments for a specific tenant.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const { id: tenantId } = params;
    
    try {
      const { decodedToken, error } = await verifyApiAuth(req, ['landlord', 'manager', 'tenant']);
      if (error) return error;

      const { role, uid, claims } = decodedToken as any;

      const tenantDoc = await db.collection('users').doc(tenantId).get();
      if (!tenantDoc.exists) {
        return NextResponse.json({ error: 'Tenant not found.' }, { status: 404 });
      }

      const tenantData = tenantDoc.data() as Tenant;
      const landlordId = tenantData.landlordId;

      const isOwner = role === 'landlord' && uid === landlordId;
      const isManager = role === 'manager' && claims.landlordId === landlordId;
      const isSelf = uid === tenantId;

      if (!isOwner && !isManager && !isSelf) {
        return NextResponse.json({ error: 'Forbidden: You do not have permission to view these payments.' }, { status: 403 });
      }

      const paymentsSnapshot = await db.collection('payments')
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
