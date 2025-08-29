
import { NextResponse, type NextRequest } from 'next/server';
import { auth, firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

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

        // 1. Create the user in Firebase Auth
        const userRecord = await auth.createUser({
            email,
            password,
            displayName,
        });

        // 2. Set custom claims for the user role
        await auth.setCustomUserClaims(userRecord.uid, { role: 'landlord', profileComplete: false });
        
        // 3. Create the landlord profile in Firestore immediately
        const landlordDocRef = firestore.collection('landlords').doc(userRecord.uid);
        await landlordDocRef.set({
          uid: userRecord.uid,
          email: userRecord.email,
          name: userRecord.displayName,
          createdAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ uid: userRecord.uid }, { status: 201 });

    } catch (error: any) {
        console.error('[ERROR: /api/auth/signup]', error);
        if (error.code === 'auth/email-already-exists') {
            return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
        }
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}
