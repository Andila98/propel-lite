
import { NextResponse, type NextRequest } from 'next/server';
import { auth, firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import jwt from 'jsonwebtoken';
import type { PropertyManager } from '@/lib/types';
import { logActivity } from '@/lib/audit-log-service';
import { z } from 'zod';
import { getLandlordAndActor } from '@/lib/auth-utils';

export const runtime = 'nodejs';

const JWT_SECRET = process.env.JWT_SECRET;

const AcceptInviteSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
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
        const body = await req.json();
        const validation = AcceptInviteSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid input.', details: validation.error.flatten() }, { status: 400 });
        }
        const { token, displayName, password } = validation.data;

        let decodedToken: any;
        try {
            decodedToken = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            return NextResponse.json({ error: 'Invalid or expired invitation token.' }, { status: 401 });
        }
        
        const { email, role, inviterId } = decodedToken;

        // 1. Create the user in Firebase Auth
        const userRecord = await auth.createUser({
            email,
            password,
            displayName,
        });

        // 2. Set custom claims for role-based access in middleware/security rules
        await auth.setCustomUserClaims(userRecord.uid, { 
            role: role, 
            profileComplete: true,
            landlordId: inviterId
        });

        // 3. Create the manager profile in Firestore, making it the source of truth for permissions
        const newManager: Omit<PropertyManager, 'id'> = {
            uid: userRecord.uid,
            name: displayName,
            email: email,
            role: 'manager', // Store role directly in Firestore
            propertiesManaged: [],
            landlordId: inviterId, 
            permissions: {
                canAddProperties: false,
                canEditProperties: true,
                canDeleteProperties: false,
                canAddTenants: true,
                canEditTenants: true,
                canDeleteTenants: false,
                canViewPayments: true,
                canManageManagers: false,
                canManageSettings: false,
            },
        };
        
        await firestore.collection('managers').doc(userRecord.uid).set(newManager);
        
        const { actor: inviter } = await getLandlordAndActor(inviterId, true);
        await logActivity(inviter?.displayName || 'Landlord', `Invited manager "${displayName}" accepted`, { type: 'Manager', name: displayName });

        return NextResponse.json({ message: 'Account created successfully.' }, { status: 201 });

    } catch (error: any) {
        console.error('[ERROR: /api/auth/accept-invite]', { message: error.message, code: error.code });
        if (error.code === 'auth/email-already-exists') {
            return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
        }
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}
