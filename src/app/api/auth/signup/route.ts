
import { NextResponse, type NextRequest } from 'next/server';
import { auth, isFirebaseAdminInitialized } from '@/lib/firebase-admin';

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

        // 1. Create the user in Firebase Auth
        const userRecord = await auth.createUser({
            email,
            password,
            displayName,
        });

        // 2. Set custom claims for the new landlord user.
        // This is the source of truth for their role.
        // profileComplete is false, directing them to onboarding after first login.
        await auth.setCustomUserClaims(userRecord.uid, { role: 'landlord', profileComplete: false });
        
        // Note: The landlord profile in Firestore will be created on their first login,
        // which is a more robust pattern.

        return NextResponse.json({ uid: userRecord.uid }, { status: 201 });

    } catch (error: any) {
        console.error('[AUTH_SIGNUP_ERROR]', error);
        if (error.code === 'auth/email-already-exists') {
            return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
        }
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}
