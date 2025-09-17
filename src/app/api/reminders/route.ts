
import { NextResponse, type NextRequest } from 'next/server';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { toJSON } from '@/lib/utils';
import { getLandlordId } from '@/lib/auth-utils';
import { authConfig } from '@/config/server-config';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    if (!isFirebaseAdminInitialized) {
        return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 500 });
    }

    const sessionCookie = req.cookies.get(authConfig.cookieName)?.value;
    const landlordId = await getLandlordId(sessionCookie);

    if (!landlordId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // In a real app, you would also filter by landlordId
        const snapshot = await firestore.collection('reminders')
            .orderBy('scheduledFor', 'asc')
            .get();
            
        const reminders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json(toJSON(reminders));
    } catch (error: any) {
        console.error('[ERROR: /api/reminders GET]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
