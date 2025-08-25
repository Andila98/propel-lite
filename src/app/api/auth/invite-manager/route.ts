
import { NextResponse, type NextRequest } from 'next/server';
import { auth, firestore } from '@/lib/firebase-admin';
import jwt from 'jsonwebtoken';
import { getUserIdFromRequest } from '@/lib/auth-utils';

export const runtime = 'nodejs';

// This secret should be in an environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(req: NextRequest) {
    try {
        const landlordId = await getUserIdFromRequest(req);
        if (!landlordId) {
            return NextResponse.json({ error: 'Unauthorized: You must be logged in to invite managers.' }, { status: 401 });
        }

        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
        }

        // Check if a user with this email already exists in Firebase Auth
        try {
            await auth.getUserByEmail(email);
            return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });
        } catch (error: any) {
            if (error.code !== 'auth/user-not-found') {
                throw error; // Re-throw unexpected errors
            }
            // If user does not exist, we can proceed.
        }

        // Generate a token that expires in 3 days
        const token = jwt.sign({ email, inviterId: landlordId, role: 'manager' }, JWT_SECRET, {
            expiresIn: '3d',
        });
        
        // Server generates the full link
        const invitationLink = `${APP_URL}/onboarding/accept-invite?token=${token}`;

        return NextResponse.json({ invitationLink }, { status: 200 });

    } catch (error: any) {
        console.error('[INVITE_MANAGER_ERROR]', error);
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}
