
import { type NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { auth, firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';

const InviteTokenSchema = z.object({
  email: z.string().email(),
  role: z.enum(['manager']),
  landlordId: z.string(),
});

const RequestBodySchema = z.object({
  token: z.string(),
  displayName: z.string().min(2),
  password: z.string().min(6),
});


export async function POST(req: NextRequest) {
    if (!isFirebaseAdminInitialized) {
        console.error('[API_ACCEPT_INVITE] Firebase Admin is not initialized.');
        return NextResponse.json({ error: 'Firebase is not initialized. Please check server credentials.' }, { status: 500 });
    }

    try {
        const body = await req.json();
        const validation = RequestBodySchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid input.' }, { status: 400 });
        }

        const { token, displayName, password } = validation.data;

        // 1. Verify the JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
        const tokenData = InviteTokenSchema.parse(decoded);

        // 2. Create the user in Firebase Auth
        const userRecord = await auth.createUser({
            email: tokenData.email,
            password: password,
            displayName: displayName,
        });

        // 3. Set custom claims for RBAC
        await auth.setCustomUserClaims(userRecord.uid, { 
            role: tokenData.role,
            landlordId: tokenData.landlordId,
            profileComplete: true, // Managers who accept invites are considered complete
        });

        // 4. Create the manager profile in Firestore
        const managerRef = firestore.collection('managers').doc(userRecord.uid);
        await managerRef.set({
            uid: userRecord.uid,
            name: displayName,
            email: tokenData.email,
            landlordId: tokenData.landlordId,
            createdAt: FieldValue.serverTimestamp(),
            // Default empty permissions
            permissions: {},
            propertiesManaged: []
        });

        return NextResponse.json({
            message: 'Account created successfully. You can now log in.',
            userId: userRecord.uid,
        }, { status: 201 });

    } catch (error: any) {
        console.error('[API_ACCEPT_INVITE_ERROR]', error);
        if (error instanceof jwt.JsonWebTokenError) {
            return NextResponse.json({ error: 'Invalid or expired invitation link.' }, { status: 400 });
        }
        if (error.code === 'auth/email-already-exists') {
            return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
        }
        return NextResponse.json({ error: `An unexpected error occurred: ${error.message}` }, { status: 500 });
    }
}
