import { NextResponse, type NextRequest } from 'next/server';
import { db, admin } from '@/lib/firebase-admin';
import { withRole, type AuthenticatedRequest } from '@/lib/middleware/withRole';
import { randomBytes } from 'crypto';
import type { Property, Unit } from '@/lib/types';
import { getAuth } from 'firebase-admin/auth';

export const GET = withRole(async (req: AuthenticatedRequest) => {
    try {
        const { role, uid, landlordId } = req.user;
        const targetLandlordId = role === 'landlord' ? uid : landlordId;
        
        if (!targetLandlordId) {
            return NextResponse.json({ error: 'Landlord ID not found for this user.' }, { status: 400 });
        }

        console.log(`API: Fetching tenants for landlord ${targetLandlordId}.`);

        const tenantsSnapshot = await db.collection('users')
            .where('role', '==', 'tenant')
            .where('landlordId', '==', targetLandlordId)
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
}, ['landlord', 'manager']);


export const POST = withRole(async (req: AuthenticatedRequest) => {
    try {
        const { uid: landlordId } = req.user;
        const body = await req.json();
        const { name, email, phone, propertyId, unitId, leaseStart, leaseEnd } = body;

        if (!name || !email || !propertyId || !unitId || !leaseStart || !leaseEnd) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // --- Start Transaction ---
        const tenantRef = db.collection('users').doc(); // Create a new ref for the tenant
        const propertyRef = db.collection('properties').doc(propertyId);
        
        await db.runTransaction(async (transaction) => {
            const propertyDoc = await transaction.get(propertyRef);
            if (!propertyDoc.exists) {
                throw new Error("Property not found.");
            }
            const propertyData = propertyDoc.data() as Property;
            if (propertyData.landlordId !== landlordId) {
                throw new Error("Unauthorized to modify this property.");
            }
            
            const units = (propertyData.units || []) as Unit[];
            const unitIndex = units.findIndex(u => u.id === unitId);

            if (unitIndex === -1) {
                throw new Error("Unit not found in this property.");
            }
            if (units[unitIndex].isOccupied) {
                throw new Error("This unit is already occupied.");
            }

            // For security, we create the user with a random password.
            // They can use the "Forgot Password" flow to set their own.
            const randomPassword = randomBytes(16).toString('hex');
            
            const userRecord = await getAuth().createUser({
                uid: tenantRef.id,
                email,
                password: randomPassword,
                displayName: name,
                phoneNumber: phone,
            });

            await getAuth().setCustomUserClaims(userRecord.uid, {
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
            
            units[unitIndex].isOccupied = true;
            units[unitIndex].tenantId = tenantRef.id;

            // Commit all changes
            transaction.set(tenantRef, newTenantData);
            transaction.update(propertyRef, { units });
        });

        // --- End Transaction ---
        
        const createdTenantDoc = await tenantRef.get();
        const createdTenant = { id: createdTenantDoc.id, ...createdTenantDoc.data() };

        return NextResponse.json(createdTenant, { status: 201 });

    } catch (error: any) {
        console.error('[TENANT_CREATE_ERROR]', error);
        if (error.code === 'auth/email-already-exists') {
            return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });
        }
        if (error.message.includes("already occupied")) {
            return NextResponse.json({ error: error.message }, { status: 409 });
        }
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}, ['landlord']);
