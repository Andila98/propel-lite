
import { type NextRequest, NextResponse } from 'next/server';
import { auth, firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';

const SignUpSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    displayName: z.string().min(2),
    role: z.enum(['landlord', 'tenant']),
});

export async function POST(req: NextRequest) {
    if (!isFirebaseAdminInitialized) {
        return NextResponse.json({ error: 'Firebase is not initialized. Please check server credentials.' }, { status: 500 });
    }

    try {
        const body = await req.json();
        const validation = SignUpSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid input.', details: validation.error.flatten() }, { status: 400 });
        }
        
        const { email, password, displayName, role } = validation.data;

        const userRecord = await auth.createUser({
            email,
            password,
            displayName,
        });

        // Set custom claims for role-based access control
        // Onboarding is not complete yet for new sign-ups.
        await auth.setCustomUserClaims(userRecord.uid, { role, profileComplete: false });
        
        // Create a corresponding document in Firestore for the landlord.
        // Tenant profiles are created when they are assigned to a property.
        if (role === 'landlord') {
            await firestore.collection('users').doc(userRecord.uid).set({
                uid: userRecord.uid,
                name: displayName,
                email: email,
                role: role,
                createdAt: FieldValue.serverTimestamp(),
            });
        }
        
        return NextResponse.json({
            message: 'User account created successfully.',
            userId: userRecord.uid,
        }, { status: 201 });

    } catch (error: any) {
        if (error.code === 'auth/email-already-exists') {
            return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
        }
        return NextResponse.json({ error: `An unexpected error occurred: ${error.message}` }, { status: 500 });
    }
}
