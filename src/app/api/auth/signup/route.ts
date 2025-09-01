
import { NextResponse, type NextRequest } from 'next/server';
import { isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { signUpUser } from '@/lib/auth-service';
import { z } from 'zod';
import { registrationRateLimit } from '@/lib/rate-limiter';

export const runtime = 'nodejs';

const SignupSchema = z.object({
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
  email: z.string().email('Please provide a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export async function POST(req: NextRequest) {
    if (!isFirebaseAdminInitialized) {
        console.error("[ERROR: /api/auth/signup] Firebase Admin not initialized.");
        return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 503 });
    }

    try {
        await registrationRateLimit.check(req);
    } catch (error) {
        return NextResponse.json({ error: 'Too many accounts created from this IP, please try again after an hour' }, { status: 429 });
    }

    try {
        const body = await req.json();
        const validation = SignupSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid input.', details: validation.error.flatten() }, { status: 400 });
        }
        const { displayName, email, password } = validation.data;
        
        const userRecord = await signUpUser({ email, password, displayName });

        return NextResponse.json({ uid: userRecord.uid }, { status: 201 });

    } catch (error: any) {
        console.error('[ERROR: /api/auth/signup]', { message: error.message, code: error.code });
        if (error.message.includes('An account with this email already exists.')) {
            return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
        }
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}
