
import { NextResponse, type NextRequest } from 'next/server';
import { firestore } from '@/lib/firebase-admin';
import type { Property } from '@/lib/types';
import { logActivity } from '@/lib/audit-log-service';
import { toJSON } from '@/lib/utils';
import { verifySession } from '@/lib/auth-utils';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const claims = await verifySession(req);
    if (!claims) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const landlordId = claims.role === 'manager' ? claims.landlordId : claims.uid;

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
        propertyData.units = unitsSnapshot.docs.map(unitDoc => ({ id: unitDoc.id, ...unitDoc.data() } as any));
        
        return NextResponse.json(toJSON(propertyData));

    } catch (error: any) {
        console.error(`[ERROR: /api/properties/{id} GET]`, error);
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}


export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    const claims = await verifySession(req);
    if (!claims) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const landlordId = claims.role === 'manager' ? claims.landlordId : claims.uid;
    
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
        await logActivity('Admin', `Deleted property "${propertyName}"`, { type: 'Property', name: propertyName });

        return NextResponse.json({ message: 'Property and its units deleted successfully.' }, { status: 200 });

    } catch (error: any) {
        console.error(`[ERROR: /api/properties/{id} DELETE]`, error);
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}
