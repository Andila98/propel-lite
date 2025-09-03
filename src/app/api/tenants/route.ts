
import { NextResponse, type NextRequest } from 'next/server';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { toJSON } from '@/lib/utils';
import { getLandlordAndActor } from '@/lib/auth-utils';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    if (!isFirebaseAdminInitialized) {
        return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 500 });
    }

    const { landlordId, actor, error: authError } = await getLandlordAndActor(req);
    
    if (authError || !actor) {
        return NextResponse.json({ error: authError?.message || 'Unauthorized' }, { status: authError?.statusCode || 401 });
    }
    
    const role = actor.customClaims?.role;
    
    // Explicit permission check for managers
    if (role === 'manager' && !actor.customClaims?.permissions?.canViewTenants) {
        return NextResponse.json({ error: "Forbidden: You don't have permission to view tenants." }, { status: 403 });
    }

    // A landlordId is required to fetch tenants
    if (!landlordId) {
         return NextResponse.json({ error: 'Unauthorized: Could not determine a landlord context.' }, { status: 401 });
    }

    try {
        const tenantsSnapshot = await firestore.collection('tenants')
            .where('landlordId', '==', landlordId)
            .get();
        const tenants = tenantsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json(toJSON(tenants), { status: 200 });
    } catch (error: any) {
      console.error('[ERROR: /api/tenants GET]', error);
      return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}
