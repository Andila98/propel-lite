
import { type NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { auth, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { z } from 'zod';
import { logActivity } from '@/lib/audit-log-service';

const InviteRequestSchema = z.object({
  email: z.string().email(),
});

async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
    const sessionCookie = req.cookies.get('PropelAuth')?.value;
    if (!sessionCookie) return null;

    try {
        const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
        return decodedClaims.uid;
    } catch (error) {
        console.error('[API_INVITE_MANAGER_ERROR] Error verifying session cookie:', error);
        return null;
    }
}

export async function POST(req: NextRequest) {
    if (!isFirebaseAdminInitialized) {
        console.error('[API_INVITE_MANAGER] Firebase Admin is not initialized.');
        return NextResponse.json({ error: 'Firebase is not initialized. Please check server credentials.' }, { status: 500 });
    }

    try {
        const landlordId = await getUserIdFromRequest(req);
        if (!landlordId) {
            return NextResponse.json({ error: 'Unauthorized: You must be logged in as a landlord.' }, { status: 401 });
        }
        
        const body = await req.json();
        const validation = InviteRequestSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid email provided.' }, { status: 400 });
        }
        const { email } = validation.data;

        // Generate a JWT token that expires in 3 days
        const token = jwt.sign(
            { email: email, role: 'manager', landlordId: landlordId },
            process.env.JWT_SECRET || 'default_secret',
            { expiresIn: '3d' }
        );

        // TODO: Get actor name from session
        await logActivity('Admin', `Invited manager with email "${email}"`, { type: 'Manager', name: email });

        // In a real app, you would also send an email with this link.
        // For now, we return the token to the client to display the link.
        return NextResponse.json({ 
            message: 'Invitation link generated successfully.',
            token: token 
        });

    } catch (error: any) {
        console.error('[API_INVITE_MANAGER_ERROR] Failed to generate invitation:', error);
        return NextResponse.json({ error: 'Failed to generate invitation link.' }, { status: 500 });
    }
}
