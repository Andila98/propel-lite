
import { NextResponse, type NextRequest } from 'next/server';
import { firestore, auth, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { toJSON } from '@/lib/utils';
import { FieldValue } from 'firebase-admin/firestore';
import { logActivity } from '@/lib/audit-log-service';
import { getLandlordId } from '@/lib/auth-utils';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    if (!isFirebaseAdminInitialized) {
        return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 500 });
    }
    const landlordId = await getLandlordId(req);
    if (!landlordId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const tenantId = params.id;
        const tenantDoc = await firestore.collection('tenants').doc(tenantId).get();

        if (!tenantDoc.exists) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
        }
        
        const tenantData = tenantDoc.data();
        if (tenantData?.landlordId !== landlordId) {
            return NextResponse.json({ error: 'Forbidden: You do not have access to this tenant.' }, { status: 403 });
        }
        
        return NextResponse.json(toJSON({ id: tenantDoc.id, ...tenantData }), { status: 200 });

    } catch (error: any) {
        console.error(`[ERROR: /api/tenants/{id} GET] Failed to fetch tenant ${params.id}:`, error);
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    if (!isFirebaseAdminInitialized) {
        return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 500 });
    }
    const landlordId = await getLandlordId(req);
    if (!landlordId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const tenantId = params.id;
        const tenantRef = firestore.collection('tenants').doc(tenantId);
        const tenantDoc = await tenantRef.get();

        if (!tenantDoc.exists) {
            return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
        }

        const tenantData = tenantDoc.data()!;
        
        if (tenantData.landlordId !== landlordId) {
            return NextResponse.json({ error: 'Forbidden: You do not have permission to delete this tenant.' }, { status: 403 });
        }

        const { propertyId, currentUnitId, uid, name } = tenantData;
        
        const batch = firestore.batch();

        // Mark the unit as unoccupied
        if (propertyId && currentUnitId) {
            const unitRef = firestore.collection('properties').doc(propertyId).collection('units').doc(currentUnitId);
            batch.update(unitRef, { isOccupied: false, tenantId: FieldValue.delete() });
        }

        // Delete the tenant document
        batch.delete(tenantRef);
        
        // Commit Firestore changes
        await batch.commit();
        
        // Delete the user from Firebase Authentication
        if (uid) {
            try {
                await auth.deleteUser(uid);
            } catch (authError: any) {
                // If user doesn't exist in auth, don't fail the whole operation
                if (authError.code !== 'auth/user-not-found') {
                    throw authError;
                }
            }
        }
        
        await logActivity('Admin', `Deleted tenant "${name}"`, { type: 'Tenant', name: name });

        return NextResponse.json({ message: 'Tenant successfully deleted.' }, { status: 200 });
    } catch (error: any) {
        console.error(`[ERROR: /api/tenants/{id} DELETE]`, error);
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}
