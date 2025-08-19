
import { NextResponse, type NextRequest } from 'next/server';
import { firestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { TenantFormSchema } from '@/lib/schemas';


export async function GET(req: NextRequest) {
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
    try {
        const body = await req.json();
        const validationResult = TenantFormSchema.safeParse(body);

        if(!validationResult.success) {
            return NextResponse.json({ error: 'Invalid data', details: validationResult.error.flatten() }, { status: 400 });
        }
        
        const { unitId, ...tenantData } = validationResult.data;

        // In a real app, we'd create a user account in Firebase Auth
        // For now, we just create the Firestore document.
        const newTenant = {
            ...tenantData,
            currentUnitId: unitId,
            rentStatus: 'Paid', // Default status
            createdAt: FieldValue.serverTimestamp(),
            // landlordId should be derived from the authenticated user's session
        };

        const tenantRef = await firestore.collection('tenants').add(newTenant);
        
        // Also update the unit to mark it as occupied
        await firestore.collection('properties').doc(tenantData.propertyId).collection('units').doc(unitId).update({
            isOccupied: true,
            tenantId: tenantRef.id
        });

        return NextResponse.json({ id: tenantRef.id, ...newTenant }, { status: 201 });

    } catch (error: any) {
      console.error('[API_TENANT_CREATE_ERROR] Failed to create tenant:', error);
      return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
