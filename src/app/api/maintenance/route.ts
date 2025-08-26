
import { NextResponse, type NextRequest } from 'next/server';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { toJSON } from '@/lib/utils';
import { prioritizeMaintenanceRequest } from '@/ai/flows/prioritize-maintenance';
import { verifySession } from '@/lib/auth-utils';

export const runtime = 'nodejs';

export async function GET() {
    if (!isFirebaseAdminInitialized) {
        return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 500 });
    }
    try {
        const snapshot = await firestore.collection('maintenanceRequests')
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
    
    // Authorization check
    const decodedToken = await verifySession(req);
    if (!decodedToken) {
        return NextResponse.json({ error: 'Unauthorized: You must be logged in to submit a request.' }, { status: 401 });
    }

    try {
        const body = await req.json();
        
        // Add validation with Zod here in a real app
        if (!body.description || !body.tenantId) {
            return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
        }
        
        // Security check: ensure the logged-in user is the one submitting the request
        if (decodedToken.uid !== body.tenantId) {
             return NextResponse.json({ error: 'Forbidden: You can only submit requests for yourself.' }, { status: 403 });
        }
        
        let priorityResult = { priority: 'Medium', reasoning: 'Default priority assigned.' };
        try {
            priorityResult = await prioritizeMaintenanceRequest({ description: body.description });
        } catch (aiError) {
            console.warn("[WARN: /api/maintenance POST] Could not prioritize request via AI:", aiError);
            // Don't block the request if AI fails
        }
        
        const newRequest = {
            ...body,
            submittedDate: new Date().toISOString(),
            priority: priorityResult.priority,
            reasoning: priorityResult.reasoning,
        };
        
        const docRef = await firestore.collection('maintenanceRequests').add(newRequest);
        
        return NextResponse.json({ id: docRef.id, ...newRequest }, { status: 201 });

    } catch (error: any)
        {
        console.error('[ERROR: /api/maintenance POST]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
