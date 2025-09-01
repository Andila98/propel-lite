
import { NextResponse, type NextRequest } from 'next/server';
import { auth, firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import jwt from 'jsonwebtoken';
import { getLandlordId } from '@/lib/auth-utils';
import { inviteManagerRateLimit } from '@/lib/rate-limiter';
import { z } from 'zod';

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

    try {
        await inviteManagerRateLimit(req);
    } catch (error) {
        return NextResponse.json({ error: 'Too many invitation requests. Please try again later.' }, { status: 429 });
    }
    
    const landlordId = await getLandlordId(req);
    if (!landlordId) {
        return NextResponse.json({ error: 'Unauthorized: You must be logged in to invite managers.' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const validation = InviteManagerSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid email provided.', details: validation.error.flatten() }, { status: 400 });
        }
        const { email } = validation.data;

        // Check if a user with this email already exists in Firebase Auth
        try {
            await auth.getUserByEmail(email);
            return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });
        } catch (error: any) {
            if (error.code !== 'auth/user-not-found') {
                throw error; // Re-throw unexpected errors
            }
        }

        const token = jwt.sign({ email, inviterId: landlordId, role: 'manager' }, JWT_SECRET, {
            expiresIn: '3d',
        });
        
        const invitationLink = `${APP_URL}/onboarding/accept-invite?token=${token}`;

        return NextResponse.json({ invitationLink }, { status: 200 });

    } catch (error: any) {
        console.error('[ERROR: /api/auth/invite-manager]', { message: error.message, code: error.code });
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}
