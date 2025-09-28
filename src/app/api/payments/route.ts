import { NextResponse, type NextRequest } from 'next/server';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { toJSON } from '@/lib/utils';
import { getLandlordAndActor } from '@/lib/auth-utils';
import { authConfig } from '@/config/server-config';
import type { Tenant, Property, Payment } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    const requestId = crypto.randomUUID();

    try {
        console.log(`[INFO][${requestId}] /api/payments GET endpoint called`);

        if (!isFirebaseAdminInitialized) {
            console.error(`[ERROR][${requestId}] Firebase Admin not initialized.`);
            return NextResponse.json({ 
                error: 'Backend services are not configured. Please contact support.' 
            }, { status: 503 });
        }
        
        const sessionCookie = req.cookies.get(authConfig.cookieName)?.value;
        if (!sessionCookie) {
            console.warn(`[WARN][${requestId}] No session cookie provided.`);
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        console.log(`[DEBUG][${requestId}] Verifying session and getting landlord ID.`);
        const { landlordId, error: authError } = await getLandlordAndActor(sessionCookie);

        if (authError || !landlordId) {
            console.warn(`[WARN][${requestId}] Authentication failed: ${authError?.message}`);
            return NextResponse.json({ error: authError?.message || 'Unauthorized' }, { status: authError?.statusCode || 401 });
        }

        console.log(`[INFO][${requestId}] Fetching data for landlord: ${landlordId}`);
        const [paymentsSnapshot, tenantsSnapshot, propertiesSnapshot] = await Promise.all([
            firestore.collection('payments')
                .where('landlordId', '==', landlordId)
                .orderBy('date', 'desc')
                .get(),
            firestore.collection('tenants').where('landlordId', '==', landlordId).get(),
            firestore.collection('properties').where('landlordId', '==', landlordId).get()
        ]);
        
        console.log(`[DEBUG][${requestId}] Fetched ${paymentsSnapshot.size} payments, ${tenantsSnapshot.size} tenants, ${propertiesSnapshot.size} properties.`);

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
                property: property || null,
            };
        });
        
        console.log(`[INFO][${requestId}] Successfully processed ${payments.length} payments. Sending response.`);
        return NextResponse.json(toJSON(payments));

    } catch (error: unknown) {
      const typedError = error as { message?: string, stack?: string };
      console.error(`[ERROR][${requestId}] /api/payments GET failed:`, {
          message: typedError.message,
          stack: process.env.NODE_ENV === 'development' ? typedError.stack : undefined
      });
      return NextResponse.json({ 
          error: 'An internal server error occurred while fetching payments.',
          details: process.env.NODE_ENV === 'development' ? typedError.message : undefined,
          requestId,
      }, { status: 500 });
    }
}
