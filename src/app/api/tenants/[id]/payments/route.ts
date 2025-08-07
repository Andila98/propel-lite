
import { NextResponse, type NextRequest } from 'next/server';
import { withRole, type AuthenticatedRequest } from '@/lib/middleware/withRole';
import { db } from '@/lib/firebase-admin';

// GET /api/tenants/[id]/payments
// Fetches all payments for a specific tenant.
export const GET = withRole(
  async (req: AuthenticatedRequest, { params }: { params: { id: string } }) => {
    const { id: tenantId } = params;
    const { uid: userId, role, landlordId } = req.user;

    try {
      // Security check: Ensure the requester is the tenant themselves or their landlord/manager.
      const tenantDoc = await db.collection('users').doc(tenantId).get();
      if (!tenantDoc.exists) {
        return NextResponse.json({ error: 'Tenant not found.' }, { status: 404 });
      }

      const tenantData = tenantDoc.data();
      const isOwner = role === 'landlord' && userId === tenantData?.landlordId;
      const isManager = role === 'manager' && landlordId === tenantData?.landlordId;
      const isSelf = userId === tenantId;

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
  },
  ['landlord', 'manager', 'tenant'] // All these roles can potentially view payments
);
