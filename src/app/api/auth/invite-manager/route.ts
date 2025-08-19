
import { type NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { auth } from '@/lib/firebase-admin';
import { z } from 'zod';

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
        return null;
    }
}

export async function POST(req: NextRequest) {
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

        // In a real app, you would also send an email with this link.
        // For now, we return the token to the client to display the link.
        console.log(`Generated invite link for ${email}: /onboarding/accept-invite?token=${token}`);

        return NextResponse.json({ 
            message: 'Invitation link generated successfully.',
            token: token 
        });

    } catch (error: any) {
        console.error('[INVITE_MANAGER_ERROR]', error);
        return NextResponse.json({ error: 'Failed to generate invitation link.' }, { status: 500 });
    }
}
