
import { NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase-admin';
import { toJSON } from '@/lib/utils';

export const runtime = 'nodejs';

export async function GET() {
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
        console.error('[API_AUDIT_LOGS_ERROR]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
