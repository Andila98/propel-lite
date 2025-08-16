
import { type NextRequest, NextResponse } from 'next/server';
import { firestore, admin } from '@/lib/firebase-admin';
import { verifyApiAuth } from '@/lib/server-utils';

export const runtime = 'nodejs';

async function handler(
    req: NextRequest, 
    allowedRoles: string[]
) {
    const { decodedToken, error } = await verifyApiAuth(req, allowedRoles);
    if (error) {
        return { decodedToken: null, response: error };
    }
    return { decodedToken, response: null };
}

export async function PUT(req: NextRequest, { params }: { params: { id: string; unitId: string } }) {
  try {
    const authResult = await handler(req, ['landlord']);
    if (authResult.response) return authResult.response;
    const { decodedToken } = authResult;

    const { uid: landlordId } = decodedToken!;
    const { id: propertyId, unitId } = params;
    const updates = await req.json();

    const propertyRef = firestore.collection('properties').doc(propertyId);
    const unitRef = propertyRef.collection('units').doc(unitId);

    const propertyDoc = await propertyRef.get();
    if (!propertyDoc.exists || propertyDoc.data()?.landlordId !== landlordId) {
      return NextResponse.json({ error: 'Unauthorized or property not found' }, { status: 403 });
    }
    
    const unitDoc = await unitRef.get();
    if (!unitDoc.exists) {
        return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
    }
    
    delete updates.id;
    delete updates.propertyId;
    delete updates.landlordId;
    delete updates.createdAt;

    await unitRef.update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return NextResponse.json({ message: 'Unit updated successfully' });
  } catch (error: any) {
    console.error(`[UPDATE_UNIT_ERROR] for property ${params.id}, unit ${params.unitId}:`, error);
    return NextResponse.json({ error: 'Failed to update unit' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string; unitId: string } }) {
    try {
        const authResult = await handler(req, ['landlord']);
        if (authResult.response) return authResult.response;
        const { decodedToken } = authResult;

        const { uid: landlordId } = decodedToken!;
        const { id: propertyId, unitId } = params;

        const propertyRef = firestore.collection('properties').doc(propertyId);
        const unitRef = propertyRef.collection('units').doc(unitId);

        const propertyDoc = await propertyRef.get();

        if (!propertyDoc.exists || propertyDoc.data()?.landlordId !== landlordId) {
            return NextResponse.json({ error: 'Unauthorized or property not found' }, { status: 403 });
        }
        
        const unitDoc = await unitRef.get();
        if (!unitDoc.exists) {
            return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
        }

        await unitRef.delete();

        return NextResponse.json({ message: 'Unit deleted successfully' });
    } catch (error: any) {
        console.error(`[DELETE_UNIT_ERROR] for property ${params.id}, unit ${params.unitId}:`, error);
        return NextResponse.json({ error: 'Failed to delete unit' }, { status: 500 });
    }
}
