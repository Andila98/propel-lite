
import { NextResponse } from 'next/server';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { toJSON } from '@/lib/utils';

export const runtime = 'nodejs';

export async function GET() {
    if (!isFirebaseAdminInitialized) {
        return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 500 });
    }
    try {
        const logsSnapshot = await firestore.collection('auditLogs').orderBy('timestamp', 'desc').limit(50).get();
        const logs = logsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
            };
        });
        
        return NextResponse.json(toJSON(logs));
    } catch (error: any) {
        console.error('[ERROR: /api/audit-logs]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
