
import { NextResponse } from 'next/server';
import { mockAuditLogs } from '@/lib/mock-data';

export async function GET() {
    try {
        // In a real application, this would fetch from a Firestore 'auditLogs' collection.
        // For now, we return mock data to demonstrate the feature.
        const logs = [
            { id: '1', managerName: 'Admin', action: 'Created new property "Greenwood Heights"', entityType: 'Property', entityName: 'Greenwood Heights', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
            { id: '2', managerName: 'Jane Doe', action: 'Updated tenant profile for John Smith', entityType: 'Tenant', entityName: 'John Smith', timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() },
            { id: '3', managerName: 'Admin', action: 'Assigned Jane Doe to manage "Sunrise Apartments"', entityType: 'Manager', entityName: 'Jane Doe', timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
            { id: '4', managerName: 'Admin', action: 'Deleted unit #A102 from "Greenwood Heights"', entityType: 'Unit', entityName: '#A102', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
            { id: '5', managerName: 'Jane Doe', action: 'Marked rent as paid for Alice Johnson', entityType: 'Tenant', entityName: 'Alice Johnson', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() }
        ];
        return NextResponse.json(logs);
    } catch (error: any) {
        console.error('API Error: Failed to fetch audit logs:', error);
        return NextResponse.json(
            { error: `Failed to fetch audit logs: ${error.message}` },
            { status: 500 }
        );
    }
}
