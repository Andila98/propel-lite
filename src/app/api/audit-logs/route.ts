
import { NextResponse } from 'next/server';
import { mockAuditLogs } from '@/lib/mock-data';

export async function GET() {
    try {
        // Return mock data directly as Firebase is removed.
        return NextResponse.json(mockAuditLogs);
    } catch (error: any) {
        console.error('API Error: Failed to fetch audit logs:', error);
        return NextResponse.json(
            { error: `Failed to fetch audit logs: ${error.message}` },
            { status: 500 }
        );
    }
}
