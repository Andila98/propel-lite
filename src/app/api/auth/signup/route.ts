
import { NextResponse, type NextRequest } from 'next/server';
import { isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { signUpUser } from '@/lib/auth-service';
import { z } from 'zod';
import { registrationRateLimit } from '@/lib/rate-limiter';
import { verifySession } from '@/lib/auth-utils';

export const runtime = 'nodejs';

const SignupSchema = z.object({
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
  email: z.string().email('Please provide a valid email address'),
  // Password is not needed here as the user is already created on the client
});

export async function POST(req: NextRequest) {
    if (!isFirebaseAdminInitialized) {
        console.error("[ERROR: /api/auth/signup] Firebase Admin not initialized.");
        return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 503 });
    }

    try {
        await registrationRateLimit.check(req);
    } catch {
        return NextResponse.json({ error: 'Too many accounts created from this IP, please try again after an hour' }, { status: 429 });
    }
    
    const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) {
        return NextResponse.json({ error: 'No authentication token provided.' }, { status: 401 });
    }
    const claims = await verifySession(idToken);
    if (!claims) {
        return NextResponse.json({ error: 'Invalid authentication token.' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const validation = SignupSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid input.', details: validation.error.flatten() }, { status: 400 });
        }
        const { displayName, email } = validation.data;
        
        // Use the UID from the already-created user
        const uid = claims.uid;
        
        // This function will now create the Firestore document and set claims
        const userRecord = await signUpUser({ uid, email, displayName });

        return NextResponse.json({ uid: userRecord.uid }, { status: 201 });

    } catch (error: unknown) {
        const typedError = error as { code?: string; message: string };
        console.error('[ERROR: /api/auth/signup]', { message: typedError.message, code: typedError.code });
        if (typedError.message.includes('An account with this email already exists.')) {
            return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
        }
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}
