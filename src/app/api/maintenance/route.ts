
import { NextResponse } from 'next/server';
import { mockMaintenanceRequests } from '@/lib/mock-data';
import { prioritizeMaintenanceRequest } from '@/ai/flows/prioritize-maintenance';
import type { MaintenanceRequest } from '@/lib/types';

export async function GET() {
    try {
        const requestsWithPriority = await Promise.all(
            mockMaintenanceRequests.map(async (req) => {
                // Only run AI if priority is not already set
                if (!req.priority) {
                    try {
                        const priorityResult = await prioritizeMaintenanceRequest({ description: req.description });
                        return { ...req, ...priorityResult };
                    } catch (aiError: any) {
                        console.warn(`[AI_PRIORITY_ERROR] for request ${req.id}: ${aiError.message}. Falling back to 'Medium'.`);
                        // Fallback to a default priority if AI fails
                        return { ...req, priority: 'Medium', reasoning: 'AI analysis failed.' } as MaintenanceRequest;
                    }
                }
                return req;
            })
        );
        
        // Sort by priority: High > Medium > Low
        requestsWithPriority.sort((a, b) => {
            const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
            return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
        });

        return NextResponse.json(requestsWithPriority);

    } catch (error: any) {
        console.error('API Error: Failed to get maintenance requests:', error);
        return NextResponse.json(
            { error: `Failed to fetch requests: ${error.message}` },
            { status: 500 }
        );
    }
}
