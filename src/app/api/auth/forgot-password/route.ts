
import { NextResponse, type NextRequest } from 'next/server';
import { auth, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { passwordResetRateLimit } from '@/lib/rate-limiter';
import { z } from 'zod';

export const runtime = 'nodejs';

const ForgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
});

export async function POST(req: NextRequest) {
    if (!isFirebaseAdminInitialized) {
      return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 503 });
    }

    try {
        await passwordResetRateLimit.check(req);
    } catch (error: any) {
        return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    try {
        const body = await req.json();
        const validation = ForgotPasswordSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid email provided.', details: validation.error.flatten() }, { status: 400 });
        }
        const { email } = validation.data;

        await auth.generatePasswordResetLink(email);
        
        // For security reasons, we send a generic success message
        // whether the email exists or not.
        return NextResponse.json({ message: 'If a user with that email exists, a password reset link has been sent.' }, { status: 200 });
    } catch (error: any) {
        console.error('[ERROR: /api/auth/forgot-password]', error);
        // Do not expose specific error messages to the client
        return NextResponse.json({ message: 'If a user with that email exists, a password reset link has been sent.' }, { status: 200 });
    }
}
