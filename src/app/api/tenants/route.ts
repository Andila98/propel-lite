
import { NextResponse, type NextRequest } from 'next/server';
import { firestore, auth, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { TenantFormSchema } from '@/lib/schemas';
import { logActivity } from '@/lib/audit-log-service';


export async function GET(req: NextRequest) {
    if (!isFirebaseAdminInitialized) {
        console.error('[API_TENANTS] Firebase Admin is not initialized.');
        return NextResponse.json({ error: 'Firebase is not initialized. Please check server credentials.' }, { status: 500 });
    }

    try {
        const tenantsSnapshot = await firestore.collection('tenants').get();
        const tenants = tenantsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json(tenants, { status: 200 });
    } catch (error: any) {
      console.error('[API_TENANTS_GET_ERROR] Failed to list tenants:', error);
      return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    if (!isFirebaseAdminInitialized) {
        console.error('[API_TENANTS] Firebase Admin is not initialized.');
        return NextResponse.json({ error: 'Firebase is not initialized. Please check server credentials.' }, { status: 500 });
    }

    try {
        const body = await req.json();
        const validationResult = TenantFormSchema.safeParse(body);

        if(!validationResult.success) {
            return NextResponse.json({ error: 'Invalid data', details: validationResult.error.flatten() }, { status: 400 });
        }
        
        const { unitId, ...tenantData } = validationResult.data;

        // 1. Create a user account in Firebase Auth for the tenant
        // A random password is created; the tenant would reset it on first login.
        const randomPassword = Math.random().toString(36).slice(-8);
        const userRecord = await auth.createUser({
            email: tenantData.email,
            password: randomPassword,
            displayName: tenantData.name,
        });
        
        // 2. Set custom claims for the tenant role
        await auth.setCustomUserClaims(userRecord.uid, { role: 'tenant', profileComplete: true });

        const newTenant = {
            ...tenantData,
            uid: userRecord.uid, // Link to the Auth user
            currentUnitId: unitId,
            rentStatus: 'Paid', // Default status
            createdAt: FieldValue.serverTimestamp(),
            // In a real multi-landlord app, landlordId would come from the authenticated user's session
            landlordId: 'default_landlord_id'
        };
        
        // 3. Create the tenant document in Firestore using their Auth UID as the document ID
        const tenantRef = firestore.collection('tenants').doc(userRecord.uid);
        await tenantRef.set(newTenant);
        
        // 4. Update the unit to mark it as occupied
        await firestore.collection('properties').doc(tenantData.propertyId).collection('units').doc(unitId).update({
            isOccupied: true,
            tenantId: tenantRef.id
        });

        // TODO: Get actor name from session
        await logActivity('Admin', `Created tenant "${tenantData.name}"`, { type: 'Tenant', name: tenantData.name });
        
        // In a real app, you would now send an email to the tenant
        // with their login details and a password reset link.

        return NextResponse.json({ id: tenantRef.id, ...newTenant }, { status: 201 });

    } catch (error: any) {
      console.error('[API_TENANT_CREATE_ERROR]', error);
       if (error.code === 'auth/email-already-exists') {
            return NextResponse.json({ error: 'An account with this email already exists. Please use a different email.' }, { status: 409 });
        }
      return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
