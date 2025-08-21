
import { NextResponse, type NextRequest } from 'next/server';
import { firestore, auth, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logActivity } from '@/lib/audit-log-service';
import { z } from 'zod';

const TenantUpdateSchema = z.object({
  name: z.string().min(2, "Please enter a valid name."),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().optional(),
  propertyId: z.string({ required_error: "Please select a property."}),
  currentUnitId: z.string({ required_error: "Please select a unit."}),
  leaseStart: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid start date" }),
  leaseEnd: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid end date" }),
});


export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    if (!isFirebaseAdminInitialized) {
        console.error(`[API_TENANTS_ID] Firebase Admin is not initialized.`);
        return NextResponse.json({ error: 'Firebase is not initialized. Please check server credentials.' }, { status: 500 });
    }

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
        console.error(`[API_TENANTS_ID_ERROR] Failed to fetch tenant ${params.id}:`, error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    if (!isFirebaseAdminInitialized) {
        console.error(`[API_TENANTS_ID] Firebase Admin is not initialized.`);
        return NextResponse.json({ error: 'Firebase is not initialized. Please check server credentials.' }, { status: 500 });
    }

    try {
        const tenantId = params.id;
        const body = await req.json();

        const validationResult = TenantUpdateSchema.safeParse(body);
        if(!validationResult.success) {
            return NextResponse.json({ error: 'Invalid data', details: validationResult.error.flatten() }, { status: 400 });
        }
        
        const tenantRef = firestore.collection('tenants').doc(tenantId);
        const tenantDoc = await tenantRef.get();

        if (!tenantDoc.exists) {
            return NextResponse.json({ error: 'Tenant not found.' }, { status: 404 });
        }
        
        const tenantData = tenantDoc.data();
        const updateData = {
            ...validationResult.data,
            leaseStart: new Date(validationResult.data.leaseStart),
            leaseEnd: new Date(validationResult.data.leaseEnd),
        };

        // Note: This logic assumes a tenant can be moved between properties/units.
        // A more complex app might require a separate "move tenant" flow.
        await tenantRef.update(updateData);
        
        // Update user record in Auth if email or name changed
        if (updateData.email !== tenantData?.email || updateData.name !== tenantData?.name) {
            await auth.updateUser(tenantId, {
                email: updateData.email,
                displayName: updateData.name,
            });
        }
        
        // TODO: Get actor name from session
        await logActivity('Admin', `Updated tenant profile for "${updateData.name}"`, { type: 'Tenant', name: updateData.name });

        return NextResponse.json({ message: 'Tenant updated successfully.' }, { status: 200 });

    } catch (error: any) {
        console.error(`[API_TENANTS_ID_ERROR] Failed to update tenant ${params.id}:`, error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}


export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    if (!isFirebaseAdminInitialized) {
        console.error(`[API_TENANTS_ID] Firebase Admin is not initialized.`);
        return NextResponse.json({ error: 'Firebase is not initialized. Please check server credentials.' }, { status: 500 });
    }
    
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
      console.error(`[API_TENANTS_ID_ERROR] Failed to delete tenant ${params.id}:`, error);
      return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
