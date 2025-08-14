import { type NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/lib/firebase-admin';
import { getTokens } from 'next-firebase-auth-edge';
import { authConfig } from '@/config/server-config';

async function handler(
    req: NextRequest, 
    { params }: { params: { id: string; unitId: string } },
    allowedRoles: string[]
) {
    const tokens = await getTokens(req, authConfig);
    if (!tokens || !allowedRoles.includes(tokens.decodedToken.role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return { tokens, params, req };
}

export async function PUT(req: NextRequest, { params }: { params: { id: string; unitId: string } }) {
  try {
    const authResult = await handler(req, { params }, ['landlord']);
    if (authResult instanceof NextResponse) return authResult;
    const { tokens } = authResult;

    const { uid: landlordId } = tokens.decodedToken;
    const { id: propertyId, unitId } = params;
    const updates = await req.json();

    const propertyRef = db.collection('properties').doc(propertyId);
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
        const authResult = await handler(req, { params }, ['landlord']);
        if (authResult instanceof NextResponse) return authResult;
        const { tokens } = authResult;

        const { uid: landlordId } = tokens.decodedToken;
        const { id: propertyId, unitId } = params;

        const propertyRef = db.collection('properties').doc(propertyId);
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
