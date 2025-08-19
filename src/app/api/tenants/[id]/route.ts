
import { NextResponse, type NextRequest } from 'next/server';
import { firestore, auth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logActivity } from '@/lib/audit-log-service';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const tenantId = params.id;
        // The tenant document ID should be the same as the Firebase Auth UID
        const tenantDoc = await firestore.collection('tenants').doc(tenantId).get();

        if (!tenantDoc.exists) {
            // It's possible the tenant was created in Auth but the Firestore doc failed.
            // Let's try to find them by uid as a fallback.
            const tenantByEmail = await firestore.collection('tenants').where('uid', '==', tenantId).limit(1).get();
            if(tenantByEmail.empty) {
                return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
            }
            const doc = tenantByEmail.docs[0];
            return NextResponse.json({ id: doc.id, ...doc.data() }, { status: 200 });
        }
        
        return NextResponse.json({ id: tenantDoc.id, ...tenantDoc.data() }, { status: 200 });

    } catch (error: any) {
        console.error(`[API_TENANT_GET_ERROR] Failed to fetch tenant ${params.id}:`, error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const tenantId = params.id;
        const tenantRef = firestore.collection('tenants').doc(tenantId);
        const tenantDoc = await tenantRef.get();

        if (!tenantDoc.exists) {
            return NextResponse.json({ error: 'Tenant not found.' }, { status: 404 });
        }

        const tenantData = tenantDoc.data();
        const propertyId = tenantData?.propertyId;
        const unitId = tenantData?.currentUnitId;
        const uid = tenantData?.uid;

        // Start a batch write
        const batch = firestore.batch();

        // 1. Un-assign the tenant from their unit
        if (propertyId && unitId) {
            const unitRef = firestore.collection('properties').doc(propertyId).collection('units').doc(unitId);
            batch.update(unitRef, { isOccupied: false, tenantId: null });
        }

        // 2. Delete the tenant document from Firestore
        batch.delete(tenantRef);
        
        // 3. Commit the Firestore changes
        await batch.commit();
        
        // 4. Delete the user from Firebase Authentication
        if (uid) {
            await auth.deleteUser(uid);
        }

        // TODO: Get actor name from session
        await logActivity('Admin', `Deleted tenant "${tenantData?.name}"`, { type: 'Tenant', name: tenantData?.name || tenantId });

        return NextResponse.json({ message: 'Tenant successfully deleted.' }, { status: 200 });
    } catch (error: any) {
      console.error(`[API_TENANT_DELETE_ERROR] Failed to delete tenant ${params.id}:`, error);
      return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
