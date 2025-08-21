
import { NextResponse, type NextRequest } from 'next/server';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import type { MaintenanceRequest } from '@/lib/types';
import { prioritizeMaintenanceRequest } from '@/ai/flows/prioritize-maintenance';

export async function GET() {
    if (!isFirebaseAdminInitialized) {
        console.error('[API_MAINTENANCE] Firebase Admin is not initialized.');
        return NextResponse.json({ error: 'Firebase is not initialized. Please check server credentials.' }, { status: 500 });
    }
    try {
        const requestsSnapshot = await firestore.collection('maintenanceRequests').orderBy('submittedDate', 'desc').get();
        let requests: MaintenanceRequest[] = requestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaintenanceRequest));

        // AI-based priority assignment for pending requests
        const requestsToPrioritize = requests.filter(r => r.status === 'Pending' && !r.priority);
        const priorityPromises = requestsToPrioritize.map(async (request) => {
            try {
                const { priority, reasoning } = await prioritizeMaintenanceRequest({ description: request.description });
                await firestore.collection('maintenanceRequests').doc(request.id).update({ priority, reasoning });
                return { ...request, priority, reasoning };
            } catch (aiError) {
                console.error(`[API_MAINTENANCE_ERROR] AI prioritization failed for request ${request.id}:`, aiError);
                // Assign a default priority if AI fails
                await firestore.collection('maintenanceRequests').doc(request.id).update({ priority: 'Medium', reasoning: 'AI analysis failed.' });
                return { ...request, priority: 'Medium', reasoning: 'AI analysis failed, assigned default priority.' };
            }
        });

        const prioritizedRequests = await Promise.all(priorityPromises);

        // Merge prioritized requests back into the main list
        requests = requests.map(r => prioritizedRequests.find(pr => pr.id === r.id) || r);
        
        // Sort by priority: High > Medium > Low
        const priorityOrder: Record<string, number> = { 'High': 3, 'Medium': 2, 'Low': 1 };
        requests.sort((a, b) => (priorityOrder[b.priority!] || 0) - (priorityOrder[a.priority!] || 0));

        return NextResponse.json(requests);

    } catch (error: any) {
        console.error('[API_MAINTENANCE_ERROR] Failed to fetch requests:', error);
        return NextResponse.json(
            { error: `Failed to fetch requests: ${error.message}` },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
     if (!isFirebaseAdminInitialized) {
        console.error('[API_MAINTENANCE] Firebase Admin is not initialized.');
        return NextResponse.json({ error: 'Firebase is not initialized. Please check server credentials.' }, { status: 500 });
    }
    try {
        const body = await req.json();
        const newRequestRef = await firestore.collection('maintenanceRequests').add(body);
        return NextResponse.json({ id: newRequestRef.id, ...body }, { status: 201 });
    } catch(error: any) {
        console.error('[API_MAINTENANCE_ERROR] Failed to create request:', error);
        return NextResponse.json({ error: 'Failed to create request'}, { status: 500 });
    }
}
