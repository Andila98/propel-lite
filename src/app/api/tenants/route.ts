

import { NextResponse, type NextRequest } from 'next/server';
import { firestore, auth } from '@/lib/firebase-admin';
import { toJSON } from '@/lib/utils';
import { TenantFormSchema } from '@/lib/schemas';
import { FieldValue } from 'firebase-admin/firestore';
import { logActivity } from '@/lib/audit-log-service';


export async function GET(req: NextRequest) {
    try {
        const tenantsSnapshot = await firestore.collection('tenants').get();
        const tenants = tenantsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json(toJSON(tenants), { status: 200 });
    } catch (error: any) {
      console.error('[API_TENANTS_GET_ERROR] Failed to list tenants:', error);
      return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const validationResult = TenantFormSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json({ error: "Invalid data", details: validationResult.error.flatten() }, { status: 400 });
        }
        
        const { unitId, ...tenantData } = validationResult.data;

        // In a real app, password should be sent securely (e.g., invite link)
        const randomPassword = Math.random().toString(36).slice(-8);

        const userRecord = await auth.createUser({
            email: tenantData.email,
            password: randomPassword,
            displayName: tenantData.name,
        });
        
        await auth.setCustomUserClaims(userRecord.uid, { role: 'tenant', profileComplete: true });

        const newTenant = {
            ...tenantData,
            uid: userRecord.uid,
            currentUnitId: unitId,
            rentStatus: 'Paid', // Default status for new tenant
            createdAt: FieldValue.serverTimestamp(),
            leaseStart: new Date(tenantData.leaseStart),
            leaseEnd: new Date(tenantData.leaseEnd),
            // This should be replaced with the actual landlord's ID from session
            landlordId: 'default_landlord_id' 
        };
        
        const tenantRef = firestore.collection('tenants').doc(userRecord.uid);
        await tenantRef.set(newTenant);
        
        // Update the unit to be occupied
        await firestore.collection('properties').doc(tenantData.propertyId).collection('units').doc(unitId).update({
            isOccupied: true,
            tenantId: tenantRef.id
        });

        await logActivity('Admin', `Created tenant "${tenantData.name}"`, { type: 'Tenant', name: tenantData.name });

        return NextResponse.json({ id: tenantRef.id, ...newTenant }, { status: 201 });

    } catch (error: any)
        console.error('[API_TENANTS_POST_ERROR]', error);
        if (error.code === 'auth/email-already-exists') {
            return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Internal Server Error: ' + error.message }, { status: 500 });
    }
}
