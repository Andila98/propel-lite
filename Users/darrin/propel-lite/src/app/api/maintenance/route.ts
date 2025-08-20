
import { NextResponse, type NextRequest } from 'next/server';
import { firestore } from '@/lib/firebase-admin';
import type { MaintenanceRequest } from '@/lib/types';
import { prioritizeMaintenanceRequest } from '@/ai/flows/prioritize-maintenance';

export async function GET() {
    try {
        const requestsSnapshot = await firestore.collection('maintenanceRequests').orderBy('submittedDate', 'desc').get();
        let requests: MaintenanceRequest[] = requestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaintenanceRequest));

        // AI-based priority assignment for pending requests
        const requestsToPrioritize = requests.filter(r => r.status === 'Pending' && !r.priority);
        const priorityPromises = requestsToPrioritize.map(async (request) => {
            try {
                console.log(`[MAINTENANCE_API] Prioritizing request: ${request.id}`);
                const { priority, reasoning } = await prioritizeMaintenanceRequest({ description: request.description });
                await firestore.collection('maintenanceRequests').doc(request.id).update({ priority, reasoning });
                return { ...request, priority, reasoning };
            } catch (aiError) {
                console.error(`[MAINTENANCE_API] AI prioritization failed for request ${request.id}:`, aiError);
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
        console.error('API Error: Failed to get maintenance requests:', error);
        return NextResponse.json(
            { error: `Failed to fetch requests: ${error.message}` },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log('[MAINTENANCE_API] Creating new maintenance request:', body);
        const newRequestRef = await firestore.collection('maintenanceRequests').add(body);
        return NextResponse.json({ id: newRequestRef.id, ...body }, { status: 201 });
    } catch(error: any) {
        console.error('API Error: Failed to create maintenance request:', error);
        return NextResponse.json({ error: 'Failed to create request'}, { status: 500 });
    }
}
