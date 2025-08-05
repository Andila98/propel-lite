
import { NextResponse, type NextRequest } from 'next/server';
import { db, admin } from '@/lib/firebase-admin';
import { withRole, type AuthenticatedRequest } from '@/lib/middleware/withRole';
import { randomBytes } from 'crypto';
import { getAuth } from 'firebase-admin/auth';
import { getTokens } from 'next-firebase-auth-edge';
import { authConfig } from '@/config/server-config';

export const GET = withRole(async (req: AuthenticatedRequest) => {
    try {
        const { uid: landlordId } = req.user;
        console.log(`API: Fetching tenants for landlord ${landlordId}.`);

        const tenantsSnapshot = await db.collection('users')
            .where('role', '==', 'tenant')
            .where('landlordId', '==', landlordId)
            .get();
            
        const tenants = tenantsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`API: Successfully fetched ${tenants.length} tenants.`);
        return NextResponse.json(tenants);
    } catch (error: any) {
        console.error('API Error: Failed to fetch tenants:', error);
        return NextResponse.json(
            { error: `Failed to fetch tenants: ${error.message}` },
            { status: 500 }
        );
    }
}, ['landlord']);


export const POST = withRole(async (req: AuthenticatedRequest) => {
    try {
        const { uid: landlordId } = req.user;
        const body = await req.json();
        const { name, email, phone, propertyId, unitId, leaseStart, leaseEnd } = body;

        if (!name || !email || !propertyId || !unitId || !leaseStart || !leaseEnd) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // For security, we create the user with a random password.
        // They can use the "Forgot Password" flow to set their own.
        const randomPassword = randomBytes(16).toString('hex');
        
        const userRecord = await admin.auth().createUser({
            email,
            password: randomPassword,
            displayName: name,
            phoneNumber: phone,
        });

        await admin.auth().setCustomUserClaims(userRecord.uid, {
            role: 'tenant',
            landlordId,
        });

        const newTenantData = {
            uid: userRecord.uid,
            name,
            email,
            phone: phone || null,
            role: 'tenant',
            landlordId,
            propertyId,
            currentUnitId: unitId,
            leaseStart: admin.firestore.Timestamp.fromDate(new Date(leaseStart)),
            leaseEnd: admin.firestore.Timestamp.fromDate(new Date(leaseEnd)),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'active',
        };

        await db.collection('users').doc(userRecord.uid).set(newTenantData);

        return NextResponse.json({ ...newTenantData, id: userRecord.uid }, { status: 201 });

    } catch (error: any) {
        console.error('[TENANT_CREATE_ERROR]', error);
        if (error.code === 'auth/email-already-exists') {
            return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}, ['landlord']);
