

import { NextResponse, type NextRequest } from 'next/server';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { verifySession } from '@/lib/auth-utils';
import { toJSON } from '@/lib/utils';
import { authConfig } from '@/config/server-config';
import type { Tenant, Property, Payment, MaintenanceRequest, Unit } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    if (!isFirebaseAdminInitialized) {
        return NextResponse.json({ error: 'Backend services are not configured' }, { status: 503 });
    }

    const sessionCookie = request.cookies.get(authConfig.cookieName)?.value;
    const claims = await verifySession(sessionCookie);

    if (!claims || claims.role !== 'tenant') {
        return NextResponse.json({ error: 'Unauthorized: Tenant access only.' }, { status: 401 });
    }
    
    const tenantId = claims.uid;

    try {
        const tenantDoc = await firestore.collection('tenants').doc(tenantId).get();
        if (!tenantDoc.exists) {
            return NextResponse.json({ error: 'Tenant profile not found.' }, { status: 404 });
        }
        const tenant = tenantDoc.data() as Tenant;

        const [propertyDoc, paymentsSnapshot, maintenanceSnapshot] = await Promise.all([
            firestore.collection('properties').doc(tenant.propertyId).get(),
            firestore.collection('payments').where('tenantId', '==', tenantId).orderBy('date', 'desc').get(),
            firestore.collection('maintenanceRequests').where('tenantId', '==', tenantId).orderBy('submittedDate', 'desc').get(),
        ]);
        
        if (!propertyDoc.exists) {
            return NextResponse.json({ error: 'Associated property not found.' }, { status: 404 });
        }
        const propertyData = propertyDoc.data() as Property;
        const unitsSnapshot = await propertyDoc.ref.collection('units').get();
        const property = { ...propertyData, id: propertyDoc.id, units: unitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Unit)) };
        
        const payments = paymentsSnapshot.docs.map(doc => doc.data() as Payment);
        const maintenanceRequests = maintenanceSnapshot.docs.map(doc => doc.data() as MaintenanceRequest);

        const portalData = {
            tenant: toJSON(tenant),
            property: toJSON(property),
            payments: toJSON(payments),
            maintenanceRequests: toJSON(maintenanceRequests),
        };

        return NextResponse.json(portalData);

    } catch (error: unknown) {
        const typedError = error as Error;
        console.error(`[ERROR: /api/tenant-portal GET]`, typedError);
        return NextResponse.json({ error: 'Failed to load tenant portal data.' }, { status: 500 });
    }
}
