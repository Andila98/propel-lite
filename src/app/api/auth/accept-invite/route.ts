
import { NextResponse, type NextRequest } from 'next/server';
import { auth, firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import * as jose from 'jose';
import type { PropertyManager } from '@/lib/types';
import { logActivity } from '@/lib/audit-log-service';
import { z } from 'zod';
import { getLandlordAndActor } from '@/lib/auth-utils';
import { registrationRateLimit } from '@/lib/rate-limiter';

export const runtime = 'nodejs';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

const AcceptInviteSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

interface DecodedInviteToken extends jose.JWTPayload {
    email: string;
    role: string;
    inviterId: string;
}

export async function POST(req: NextRequest) {
    if (!isFirebaseAdminInitialized) {
        return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 503 });
    }
    if (!process.env.JWT_SECRET) {
        console.error("[ERROR] JWT_SECRET environment variable is not set.");
        return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
    }
    
    try {
        await registrationRateLimit.check(req);
    } catch {
        return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    try {
        const body = await req.json();
        const validation = AcceptInviteSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid input.', details: validation.error.flatten() }, { status: 400 });
        }
        const { token, displayName, password } = validation.data;

        let payload;
        try {
            const { payload: verifiedPayload } = await jose.jwtVerify(token, JWT_SECRET);
            payload = verifiedPayload;
        } catch {
            return NextResponse.json({ error: 'Invalid or expired invitation token.' }, { status: 401 });
        }
        
        const { email, role, inviterId } = payload as DecodedInviteToken;

        // 1. Create the user in Firebase Auth
        const userRecord = await auth.createUser({
            email,
            password,
            displayName,
        });

        const defaultPermissions = {
            canAddProperties: false,
            canEditProperties: true,
            canDeleteProperties: false,
            canAddTenants: true,
            canEditTenants: true,
            canDeleteTenants: false,
            canViewPayments: true,
            canViewTenants: true, // Grant view permission by default
            canManageManagers: false,
            canManageSettings: false,
        };

        // 2. Set custom claims for role-based access in middleware/security rules
        await auth.setCustomUserClaims(userRecord.uid, { 
            role: role, 
            profileComplete: true,
            landlordId: inviterId,
            permissions: defaultPermissions
        });

        // 3. Create the manager profile in Firestore, making it the source of truth for permissions
        const newManager: Omit<PropertyManager, 'id'> = {
            uid: userRecord.uid,
            name: displayName,
            email: email,
            role: 'manager', // Store role directly in Firestore
            propertiesManaged: [],
            landlordId: inviterId, 
            permissions: defaultPermissions,
        };
        
        await firestore.collection('managers').doc(userRecord.uid).set(newManager);
        
        const { actor: inviter } = await getLandlordAndActor(inviterId, true);
        await logActivity(inviter?.displayName || 'Landlord', `Invited manager "${displayName}" accepted`, { type: 'Manager', name: displayName }, inviterId);

        return NextResponse.json({ message: 'Account created successfully.' }, { status: 201 });

    } catch (error: unknown) {
        const typedError = error as { code?: string; message: string };
        console.error('[ERROR: /api/auth/accept-invite]', { message: typedError.message, code: typedError.code });
        if (typedError.code === 'auth/email-already-exists') {
            return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
        }
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}
