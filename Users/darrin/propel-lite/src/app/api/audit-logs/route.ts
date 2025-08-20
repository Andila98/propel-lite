
import { NextResponse } from 'next/server';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import type { AuditLog } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';

export async function GET() {
    if (!isFirebaseAdminInitialized) {
        return NextResponse.json(
            { error: `Firestore is not configured. Please check server credentials.` },
            { status: 500 }
        );
    }
    try {
        const logsSnapshot = await firestore.collection('auditLogs').orderBy('timestamp', 'desc').limit(50).get();
        
        const logs = logsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                timestamp: (data.timestamp.toDate() as Date).toISOString(),
            }
        }) as AuditLog[];

        return NextResponse.json(logs);

    } catch (error: any) {
        return NextResponse.json(
            { error: `Failed to fetch audit logs: ${error.message}` },
            { status: 500 }
        );
    }
}
