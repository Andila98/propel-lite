
import { NextResponse, type NextRequest } from 'next/server';
import { firestore } from '@/lib/firebase-admin';
import { toJSON } from '@/lib/utils';
import { prioritizeMaintenanceRequest } from '@/ai/flows/prioritize-maintenance';

export const runtime = 'nodejs';

export async function GET() {
    try {
        const snapshot = await firestore.collection('maintenanceRequests')
            .orderBy('submittedDate', 'desc')
            .get();
            
        const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json(toJSON(requests));
    } catch (error: any) {
        console.error('[API_MAINTENANCE_GET_ERROR]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        
        // Add validation with Zod here in a real app
        if (!body.description || !body.tenantId) {
            return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
        }
        
        let priorityResult = { priority: 'Medium', reasoning: 'Default priority assigned.' };
        try {
            priorityResult = await prioritizeMaintenanceRequest({ description: body.description });
        } catch (aiError) {
            console.warn("[MAINTENANCE_AI_ERROR] Could not prioritize request:", aiError);
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

    } catch (error: any) {
        console.error('[API_MAINTENANCE_POST_ERROR]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
