
import { NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase-admin';
import type { AuditLog } from '@/lib/types';

// Mock audit log data for demonstration
const mockAuditLogs: AuditLog[] = [
    {
        id: '1',
        managerName: 'John Doe',
        action: 'Updated rent for Unit A4 from Ksh1200 to Ksh1250.',
        entityType: 'Unit',
        entityName: 'Sunshine Apartments, Unit A4',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
    },
    {
        id: '2',
        managerName: 'Jane Smith',
        action: 'Deleted property "123 Oak Avenue".',
        entityType: 'Property',
        entityName: '123 Oak Avenue',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    },
    {
        id: '3',
        managerName: 'John Doe',
        action: 'Added new tenant "Alice Johnson" to Maple View, Unit 10.',
        entityType: 'Tenant',
        entityName: 'Alice Johnson',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    },
    {
        id: '4',
        managerName: 'System',
        action: 'Granted "Edit Properties" permission to manager "Jane Smith".',
        entityType: 'Manager',
        entityName: 'Jane Smith',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    },
];


export async function GET() {
    try {
        // In a real implementation, you would fetch from Firestore:
        // const logsSnapshot = await firestore.collection('audit_logs').orderBy('timestamp', 'desc').get();
        // const logs = logsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // For now, we return mock data.
        return NextResponse.json(mockAuditLogs);
    } catch (error: any) {
        console.error('API Error: Failed to fetch audit logs:', error);
        return NextResponse.json(
            { error: `Failed to fetch audit logs: ${error.message}` },
            { status: 500 }
        );
    }
}
