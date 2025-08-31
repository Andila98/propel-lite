
import { NextResponse, type NextRequest } from 'next/server';
import { auth, firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import jwt from 'jsonwebtoken';
import type { PropertyManager } from '@/lib/types';
import { logActivity } from '@/lib/audit-log-service';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

export async function POST(req: NextRequest) {
    if (!isFirebaseAdminInitialized) {
        return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 500 });
    }
    try {
        const { token, displayName, password } = await req.json();

        if (!token || !displayName || !password) {
            return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
        }
        
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
                // Default permissions for a new manager
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
        
        // 4. Log this activity *after* all database operations are successful
        const inviter = await auth.getUser(inviterId);
        await logActivity(inviter.displayName || 'Landlord', `Invited manager "${displayName}"`, { type: 'Manager', name: displayName });


        return NextResponse.json({ message: 'Account created successfully.' }, { status: 201 });

    } catch (error: any) {
        console.error('[ERROR: /api/auth/accept-invite]', error);
         if (error.code === 'auth/email-already-exists') {
            return NextResponse.json({ error: 'An account with this email has already been created.' }, { status: 409 });
        }
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}
