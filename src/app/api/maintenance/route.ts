
import { NextResponse } from 'next/server';
import { mockMaintenanceRequests } from '@/lib/mock-data';

export async function GET() {
    try {
        return NextResponse.json(mockMaintenanceRequests);
    } catch (error: any) {
        console.error('API Error: Failed to get maintenance requests:', error);
        return NextResponse.json(
            { error: `Failed to fetch requests: ${error.message}` },
            { status: 500 }
        );
    }
}
