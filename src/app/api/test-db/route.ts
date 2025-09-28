
import { NextResponse } from 'next/server';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { toJSON } from '@/lib/utils';

export const runtime = 'nodejs';

export async function GET(_request: Request) {
    console.log('[INFO] /api/test-db endpoint hit');
    
    if (!isFirebaseAdminInitialized) {
        console.error('[ERROR] /api/test-db: Firebase Admin not initialized');
        return NextResponse.json({ error: 'Backend services are not configured.' }, { status: 500 });
    }

    try {
        console.log('[INFO] /api/test-db: Querying Firestore for landlords...');
        const landlordsSnapshot = await firestore.collection('landlords').limit(1).get();
        
        if (landlordsSnapshot.empty) {
            console.warn('[WARN] /api/test-db: No documents found in landlords collection.');
            return NextResponse.json({ message: 'Firestore connection is OK, but no landlords found.' }, { status: 200 });
        }

        const landlord = landlordsSnapshot.docs[0].data();
        console.log('[INFO] /api/test-db: Successfully fetched landlord data.');
        
        return NextResponse.json(toJSON(landlord));

    } catch (error: unknown) {
        const typedError = error as Error;
        console.error('[ERROR: /api/test-db]', {
            message: typedError.message,
            stack: typedError.stack,
        });
        return NextResponse.json({ error: 'Internal server error during Firestore query.' }, { status: 500 });
    }
}
