
import { NextResponse, type NextRequest } from 'next/server';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { toJSON } from '@/lib/utils';
import { getLandlordAndActor } from '@/lib/auth-utils';
import { authConfig } from '@/config/server-config';
import type { Tenant, Property, Payment } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    if (!isFirebaseAdminInitialized) {
        return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 500 });
    }
    
    const sessionCookie = req.cookies.get(authConfig.cookieName)?.value;
    if (!sessionCookie) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { landlordId, error: authError } = await getLandlordAndActor(sessionCookie);

    if (authError || !landlordId) {
        return NextResponse.json({ error: authError?.message || 'Unauthorized' }, { status: authError?.statusCode || 401 });
    }

    try {
        const [paymentsSnapshot, tenantsSnapshot, propertiesSnapshot] = await Promise.all([
            firestore.collection('payments')
                .where('landlordId', '==', landlordId)
                .orderBy('date', 'desc')
                .get(),
            firestore.collection('tenants').where('landlordId', '==', landlordId).get(),
            firestore.collection('properties').where('landlordId', '==', landlordId).get()
        ]);
        
        const tenantsMap = new Map<string, Tenant>(tenantsSnapshot.docs.map(doc => [doc.id, doc.data() as Tenant]));
        const propertiesMap = new Map<string, Property>(propertiesSnapshot.docs.map(doc => [doc.id, doc.data() as Property]));

        const payments = paymentsSnapshot.docs.map(doc => {
            const payment = doc.data() as Payment;
            const tenant = tenantsMap.get(payment.tenantId);
            const property = propertiesMap.get(payment.propertyId);
            
            return { 
                id: doc.id,
                ...payment,
                tenantName: tenant?.name || 'N/A',
                propertyAddress: property?.address || 'N/A',
                property,
            };
        });
        
        return NextResponse.json(toJSON(payments));
    } catch (error: any) {
      console.error('[ERROR: /api/payments GET]', error);
      return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}
