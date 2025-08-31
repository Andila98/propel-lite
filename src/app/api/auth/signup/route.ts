
import { NextResponse, type NextRequest } from 'next/server';
import { isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { signUpUser } from '@/lib/auth-service';


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
        
        const userRecord = await signUpUser({ email, password, displayName });

        return NextResponse.json({ uid: userRecord.uid }, { status: 201 });

    } catch (error: any) {
        console.error('[ERROR: /api/auth/signup]', error);
        if (error.message.includes('An account with this email already exists.')) {
            return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
        }
        return NextResponse.json({ error: error.message || 'An internal server error occurred.' }, { status: 500 });
    }
}
