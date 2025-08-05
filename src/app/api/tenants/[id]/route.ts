
import { NextResponse } from 'next/server';
import { db, admin } from '@/lib/firebase-admin';
import { withRole, type AuthenticatedRequest } from '@/lib/middleware/withRole';
import type { Unit } from '@/lib/types';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = params.id;
    if (!tenantId) {
        return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    const tenantDoc = await db.collection('users').doc(tenantId).get();

    if (!tenantDoc.exists || tenantDoc.data()?.role !== 'tenant') {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const tenant = { id: tenantDoc.id, ...tenantDoc.data() };
    return NextResponse.json(tenant);
    
  } catch (error: any) {
    console.error(`API Error: Failed to fetch tenant ${params.id}:`, error);
    return NextResponse.json(
      { error: `Failed to fetch tenant: ${error.message}` },
      { status: 500 }
    );
  }
}


export const DELETE = withRole(async (req: AuthenticatedRequest, { params }: { params: { id: string } }) => {
  try {
    const { uid: landlordId } = req.user;
    const tenantId = params.id;

    const tenantRef = db.collection('users').doc(tenantId);
    const tenantDoc = await tenantRef.get();

    if (!tenantDoc.exists || tenantDoc.data()?.role !== 'tenant') {
        return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const tenantData = tenantDoc.data();
    if (tenantData?.landlordId !== landlordId) {
        return NextResponse.json({ error: 'Unauthorized to delete this tenant' }, { status: 403 });
    }
    
    // Off-boarding Step 1: Unassign the unit
    const propertyId = tenantData.propertyId;
    const unitId = tenantData.currentUnitId;

    if (propertyId && unitId) {
        const unitRef = db.collection('properties').doc(propertyId).collection('units').doc(unitId);
        const unitDoc = await unitRef.get();
        if (unitDoc.exists) {
            await unitRef.update({
                isOccupied: false,
                tenantId: admin.firestore.FieldValue.delete(),
            });
        }
    }

    // Off-boarding Step 2: Delete user from Auth
    await admin.auth().deleteUser(tenantId);

    // Off-boarding Step 3: Delete user document from Firestore
    await tenantRef.delete();

    // Optional: Delete associated payments, or keep them for historical records.
    // For now, we will keep them.

    return NextResponse.json({ message: 'Tenant successfully deleted and unassigned.' });
  } catch (error: any) {
    console.error(`[TENANT_DELETE_ERROR] for ID ${params.id}:`, error);
    if (error.code === 'auth/user-not-found') {
        // If auth user is already deleted, try to delete from firestore anyway.
        await db.collection('users').doc(params.id).delete().catch(() => {});
        return NextResponse.json({ message: 'Tenant record cleaned up.' });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, ['landlord']);
