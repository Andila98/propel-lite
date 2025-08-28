
import { NextResponse, type NextRequest } from 'next/server';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { toJSON } from '@/lib/utils';
import { verifySession } from '@/lib/auth-utils';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    if (!isFirebaseAdminInitialized) {
        return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 500 });
    }
    
    const claims = await verifySession(req);
    if (!claims || (claims.role !== 'landlord' && claims.role !== 'manager')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const landlordId = claims.role === 'manager' ? claims.landlordId : claims.uid;
    if (!landlordId) {
         return NextResponse.json({ error: 'Unauthorized: No landlord association found.' }, { status: 401 });
    }

    try {
        const paymentsSnapshot = await firestore.collection('payments')
            .where('landlordId', '==', landlordId)
            .orderBy('date', 'desc')
            .get();
        const payments = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        return NextResponse.json(toJSON(payments));
    } catch (error: any) {
      console.error('[ERROR: /api/payments GET]', error);
      return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}
