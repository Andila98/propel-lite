
import { NextResponse } from 'next/server';
import { mockMaintenanceRequests } from '@/lib/mock-data';
import type { MaintenanceRequest } from '@/lib/types';

export async function GET() {
    try {
        // AI-based priority is hardcoded in mock data for this version
        const requestsWithPriority = [...mockMaintenanceRequests];
        
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
