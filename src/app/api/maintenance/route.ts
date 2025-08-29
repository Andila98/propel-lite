
import { NextResponse, type NextRequest } from 'next/server';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { toJSON } from '@/lib/utils';
import { prioritizeMaintenanceRequest } from '@/ai/flows/prioritize-maintenance';
import { verifySession, getLandlordId } from '@/lib/auth-utils';
import type { Tenant } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    if (!isFirebaseAdminInitialized) {
        return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 500 });
    }

    const landlordId = await getLandlordId(req);
    if (!landlordId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const snapshot = await firestore.collection('maintenanceRequests')
            .where('landlordId', '==', landlordId)
            .orderBy('submittedDate', 'desc')
            .get();
            
        const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json(toJSON(requests));
    } catch (error: any) {
        console.error('[ERROR: /api/maintenance GET]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    if (!isFirebaseAdminInitialized) {
        return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 500 });
    }
    
    const body = await req.json();
    if (!body.description) {
        return NextResponse.json({ error: 'Missing description field.' }, { status: 400 });
    }
    
    const decodedToken = await verifySession(req);
    if (!decodedToken || decodedToken.role !== 'tenant') {
        return NextResponse.json({ error: 'Unauthorized: Only tenants can submit requests.' }, { status: 401 });
    }
    
    const tenantId = decodedToken.uid;

    try {
        const tenantDoc = await firestore.collection('tenants').doc(tenantId).get();
        if (!tenantDoc.exists) {
            return NextResponse.json({ error: 'Tenant profile not found.' }, { status: 404 });
        }
        const tenant = tenantDoc.data() as Tenant;
        
        let priorityResult = { priority: 'Medium', reasoning: 'Default priority assigned.' };
        try {
            priorityResult = await prioritizeMaintenanceRequest({ description: body.description });
        } catch (aiError) {
            console.warn("[WARN: /api/maintenance POST] Could not prioritize request via AI:", aiError);
        }
        
        const newRequest = {
            ...body,
            tenantId: tenant.uid,
            tenantName: tenant.name,
            propertyId: tenant.propertyId,
            landlordId: tenant.landlordId, // Add landlordId to the request
            submittedDate: new Date().toISOString(),
            priority: priorityResult.priority,
            reasoning: priorityResult.reasoning,
            status: 'Pending',
        };
        
        const docRef = await firestore.collection('maintenanceRequests').add(newRequest);
        
        return NextResponse.json({ id: docRef.id, ...newRequest }, { status: 201 });

    } catch (error: any)
        {
        console.error('[ERROR: /api/maintenance POST]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
