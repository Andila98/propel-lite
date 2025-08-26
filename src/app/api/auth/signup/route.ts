
import { NextResponse, type NextRequest } from 'next/server';
import { auth, firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    if (!isFirebaseAdminInitialized) {
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

        // Set custom claims for the new landlord user
        // profileComplete is false so they are directed to the onboarding flow
        await auth.setCustomUserClaims(userRecord.uid, { role: 'landlord', profileComplete: false });
        
        // Also create a landlord profile in Firestore
        await firestore.collection('landlords').doc(userRecord.uid).set({
            uid: userRecord.uid,
            email: userRecord.email,
            name: userRecord.displayName,
            createdAt: FieldValue.serverTimestamp(),
        });
        
        return NextResponse.json({ uid: userRecord.uid }, { status: 201 });
    } catch (error: any) {
        console.error('[AUTH_SIGNUP_ERROR]', error);
        if (error.code === 'auth/email-already-exists') {
            return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
        }
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}
