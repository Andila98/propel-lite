
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
        const rateLimitResult = await passwordResetRateLimit.check(req);
        if (!rateLimitResult.allowed) {
            return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
        }
    } catch (error: any) {
        console.error('[ERROR] Rate limiter failed', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    try {
        const body = await req.json();
        const validation = ForgotPasswordSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid email provided.', details: validation.error.flatten() }, { status: 400 });
        }
        const { email } = validation.data;

        await auth.generatePasswordResetLink(email);
        
        return NextResponse.json({ message: 'If a user with that email exists, a password reset link has been sent.' }, { status: 200 });
    } catch (error: any) {
        console.error('[ERROR: /api/auth/forgot-password]', error);
        return NextResponse.json({ message: 'If a user with that email exists, a password reset link has been sent.' }, { status: 200 });
    }
}
