
import { NextResponse, type NextRequest } from 'next/server';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { toJSON } from '@/lib/utils';
import { getLandlordAndActor } from '@/lib/auth-utils';
import { authConfig } from '@/config/server-config';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    if (!isFirebaseAdminInitialized) {
        return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 500 });
    }
    
    const sessionCookie = request.cookies.get(authConfig.cookieName)?.value;
    if (!sessionCookie) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { landlordId, error: authError } = await getLandlordAndActor(sessionCookie);

    if (authError || !landlordId) {
        return NextResponse.json({ error: authError?.message || 'Unauthorized' }, { status: authError?.statusCode || 401 });
    }

    try {
        const logsSnapshot = await firestore.collection('auditLogs')
            .where('landlordId', '==', landlordId)
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get();
            
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
