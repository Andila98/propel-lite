import { NextResponse, type NextRequest } from 'next/server';
import { auth, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import jwt from 'jsonwebtoken';
import { getLandlordAndActor } from '@/lib/auth-utils';
import { inviteManagerRateLimit } from '@/lib/rate-limiter';
import { z } from 'zod';
import { logActivity } from '@/lib/audit-log-service';
import { authConfig } from '@/config/server-config';

export const runtime = 'nodejs';

const JWT_SECRET = process.env.JWT_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const InviteManagerSchema = z.object({
  email: z.string().email('Please provide a valid email address.'),
});

export async function POST(req: NextRequest) {
    if (!isFirebaseAdminInitialized) {
        return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 503 });
    }
    if (!JWT_SECRET) {
        console.error("[ERROR] JWT_SECRET environment variable is not set.");
        return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
    }

    const sessionCookie = req.cookies.get(authConfig.cookieName)?.value;
    if (!sessionCookie) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { landlordId, actor, error: authError } = await getLandlordAndActor(sessionCookie);
    if (authError || !landlordId || !actor) {
        return NextResponse.json({ error: authError?.message || 'Unauthorized' }, { status: authError?.statusCode || 401 });
    }

    try {
        await inviteManagerRateLimit.check(req);
    } catch (error: unknown) {
        const rateLimitError = error as { code?: string };
        if (rateLimitError.code === 'RATE_LIMIT_EXCEEDED') {
            return NextResponse.json({ error: 'Too many invitation requests. Please try again later.' }, { status: 429 });
        }
        console.error('[ERROR] Rate limiter failed', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    try {
        const body = await req.json();
        const validation = InviteManagerSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid email provided.', details: validation.error.flatten() }, { status: 400 });
        }
        const { email } = validation.data;

        try {
            await auth.getUserByEmail(email);
            return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });
        } catch (error: unknown) {
            const userNotFoundError = error as { code?: string };
            if (userNotFoundError.code !== 'auth/user-not-found') {
                throw error;
            }
        }

        const token = jwt.sign({ email, inviterId: landlordId, role: 'manager' }, JWT_SECRET, {
            expiresIn: '3d', // Invitation expires in 3 days
        });
        
        const invitationLink = `${APP_URL}/onboarding/accept-invite?token=${token}`;

        await logActivity(actor.displayName || 'Landlord', `Sent invitation to manager "${email}"`, { type: 'Manager', name: email }, landlordId);

        return NextResponse.json({ invitationLink }, { status: 200 });

    } catch (error: unknown) {
        const typedError = error as { message: string, code?: string };
        console.error('[ERROR: /api/auth/invite-manager]', { message: typedError.message, code: typedError.code });
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}
