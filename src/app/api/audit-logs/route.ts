
import { NextResponse } from 'next/server';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import type { AuditLog } from '@/lib/types';
import { toISOString } from '@/lib/utils';

export async function GET() {
    if (!isFirebaseAdminInitialized) {
        console.error('[API_AUDIT_LOGS] Firebase Admin is not initialized.');
        return NextResponse.json({ error: 'Firebase is not initialized. Please check server credentials.' }, { status: 500 });
    }

    try {
        const logsSnapshot = await firestore.collection('auditLogs').orderBy('timestamp', 'desc').limit(50).get();
        
        const logs = logsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                timestamp: toISOString(data.timestamp),
            }
        }) as AuditLog[];

        return NextResponse.json(logs);

    } catch (error: any) {
        console.error('[API_AUDIT_LOGS_ERROR] Failed to fetch audit logs:', error);
        return NextResponse.json(
            { error: `Failed to fetch audit logs: ${error.message}` },
            { status: 500 }
        );
    }
}
