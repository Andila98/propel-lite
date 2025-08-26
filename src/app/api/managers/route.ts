
import { NextResponse, type NextRequest } from 'next/server';
import { firestore } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    try {
        const managersSnapshot = await firestore.collection('managers').get();
        const managers = managersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json(managers, { status: 200 });
    } catch (error: any) {
      console.error('[ERROR: /api/managers GET]', error);
      return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}
