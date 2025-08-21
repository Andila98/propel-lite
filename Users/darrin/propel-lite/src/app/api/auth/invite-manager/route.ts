
import { type NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { z } from 'zod';
import { logActivity } from '@/lib/audit-log-service';
import { getUserIdFromRequest } from '@/lib/auth-utils';


const InviteRequestSchema = z.object({
  email: z.string().email(),
});

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
        console.log(`Generated invite link for ${email}: /onboarding/accept-invite?token=${token}`);

        return NextResponse.json({ 
            message: 'Invitation link generated successfully.',
            token: token 
        });

    } catch (error: any) {
        console.error('[API_INVITE_MANAGER_ERROR]', error);
        return NextResponse.json({ error: 'Failed to generate invitation link.' }, { status: 500 });
    }
}
