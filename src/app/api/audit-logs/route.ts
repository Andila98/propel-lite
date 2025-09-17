
import { NextResponse, type NextRequest } from 'next/server';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { toJSON } from '@/lib/utils';
import { getLandlordAndActor } from '@/lib/auth-utils';
import { authConfig } from '@/config/server-config';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    const requestId = crypto.randomUUID();
    console.log(`[INFO][${requestId}] /api/audit-logs GET endpoint called`);

    if (!isFirebaseAdminInitialized) {
        console.error(`[ERROR][${requestId}] Firebase Admin not initialized.`);
        return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 500 });
    }
    
    const sessionCookie = request.cookies.get(authConfig.cookieName)?.value;
    if (!sessionCookie) {
        console.warn(`[WARN][${requestId}] No session cookie provided.`);
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    try {
        console.log(`[DEBUG][${requestId}] Verifying session and getting landlord ID.`);
        const { landlordId, error: authError } = await getLandlordAndActor(sessionCookie);

        if (authError || !landlordId) {
            console.warn(`[WARN][${requestId}] Authentication failed: ${authError?.message}`);
            return NextResponse.json({ error: authError?.message || 'Unauthorized' }, { status: authError?.statusCode || 401 });
        }

        console.log(`[INFO][${requestId}] Fetching audit logs for landlord: ${landlordId}`);
        const logsSnapshot = await firestore.collection('auditLogs')
            .where('landlordId', '==', landlordId)
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get();
        
        console.log(`[DEBUG][${requestId}] Fetched ${logsSnapshot.size} audit logs.`);
            
        const logs = logsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
            };
        });
        
        console.log(`[INFO][${requestId}] Successfully processed audit logs. Sending response.`);
        return NextResponse.json(toJSON(logs));
    } catch (error: any) {
        console.error(`[ERROR][${requestId}] /api/audit-logs GET failed:`, {
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
        return NextResponse.json({ error: 'Internal server error while fetching audit logs.' }, { status: 500 });
    }
}
