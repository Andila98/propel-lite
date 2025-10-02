
import { NextResponse, type NextRequest } from 'next/server';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import type { Property, Unit } from '@/lib/types';
import { logActivity } from '@/lib/audit-log-service';
import { toJSON } from '@/lib/utils';
import { getLandlordAndActor } from '@/lib/auth-utils';
import { authConfig } from '@/config/server-config';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, context: any) {
    if (!isFirebaseAdminInitialized) {
        return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 500 });
    }
    const { params } = context;
    const sessionCookie = req.cookies.get(authConfig.cookieName)?.value;
    if (!sessionCookie) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { landlordId, error: authError } = await getLandlordAndActor(sessionCookie);

    if (authError || !landlordId) {
        return NextResponse.json({ error: authError?.message || 'Unauthorized' }, { status: authError?.statusCode || 401 });
    }

    try {
        const propertyId = params.id;
        const propertyDoc = await firestore.collection('properties').doc(propertyId).get();

        if (!propertyDoc.exists) {
            return NextResponse.json({ error: 'Property not found' }, { status: 404 });
        }

        const propertyData = { id: propertyDoc.id, ...propertyDoc.data() } as Property;
        
        // Ownership check
        if (propertyData.landlordId !== landlordId) {
            return NextResponse.json({ error: 'Forbidden: You do not have access to this property.' }, { status: 403 });
        }
        
        const unitsSnapshot = await propertyDoc.ref.collection('units').get();
        propertyData.units = unitsSnapshot.docs.map(unitDoc => ({ id: unitDoc.id, ...unitDoc.data() } as Unit));
        
        return NextResponse.json(toJSON(propertyData));

    } catch (error: unknown) {
        const typedError = error as Error;
        console.error(`[ERROR: /api/properties/{id} GET]`, typedError);
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}


export async function DELETE(req: NextRequest, context: any) {
    if (!isFirebaseAdminInitialized) {
        return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 500 });
    }
    const { params } = context;
    const sessionCookie = req.cookies.get(authConfig.cookieName)?.value;
    if (!sessionCookie) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { landlordId, actor, error: authError } = await getLandlordAndActor(sessionCookie);

    if (authError || !landlordId || !actor) {
        return NextResponse.json({ error: authError?.message || 'Unauthorized' }, { status: authError?.statusCode || 401 });
    }
    
    try {
        const propertyId = params.id;
        const propertyRef = firestore.collection('properties').doc(propertyId);
        const propertyDoc = await propertyRef.get();

        if (!propertyDoc.exists) {
            return NextResponse.json({ error: 'Property not found' }, { status: 404 });
        }
        
        const propertyData = propertyDoc.data();
        if (propertyData?.landlordId !== landlordId) {
            return NextResponse.json({ error: 'Forbidden: You do not have permission to delete this property.' }, { status: 403 });
        }
        
        // In a real application, you would also delete associated tenants, payments, etc.
        // For simplicity, we'll just delete the property and its units here.

        const unitsSnapshot = await propertyRef.collection('units').get();
        const batch = firestore.batch();

        unitsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        batch.delete(propertyRef);
        await batch.commit();

        const propertyName = propertyData?.name || propertyData?.address;
        await logActivity(actor.displayName || 'Admin', `Deleted property "${propertyName}"`, { type: 'Property', name: propertyName }, landlordId);

        return NextResponse.json({ message: 'Property and its units deleted successfully.' }, { status: 200 });

    } catch (error: unknown) {
        const typedError = error as Error;
        console.error(`[ERROR: /api/properties/{id} DELETE]`, typedError);
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}
