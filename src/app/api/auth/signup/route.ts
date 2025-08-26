
import { NextResponse, type NextRequest } from 'next/server';
import { auth, isFirebaseAdminInitialized } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    if (!isFirebaseAdminInitialized) {
        console.error("[ERROR: /api/auth/signup] Firebase Admin not initialized.");
        return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 500 });
    }

    try {
        const { displayName, email, password } = await req.json();

        if (!email || !password || !displayName) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const userRecord = await auth.createUser({
            email,
            password,
            displayName,
        });

        await auth.setCustomUserClaims(userRecord.uid, { role: 'landlord', profileComplete: false });
        
        // The landlord profile in Firestore is now created on their first login,
        // which is a more robust pattern to ensure data consistency.

        return NextResponse.json({ uid: userRecord.uid }, { status: 201 });

    } catch (error: any) {
        console.error('[ERROR: /api/auth/signup]', error);
        if (error.code === 'auth/email-already-exists') {
            return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
        }
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}
