
import { type NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/lib/firebase-admin';
import { withRole, type AuthenticatedRequest } from '@/lib/middleware/withRole';
import type { Property, Unit } from '@/lib/types';

export const PUT = withRole(async (req: AuthenticatedRequest, { params }: { params: { id: string; unitId: string } }) => {
  try {
    const { uid: landlordId } = req.user;
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
    
    // Ensure critical fields are not updated from the client
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
}, ['landlord']);

export const DELETE = withRole(async (req: AuthenticatedRequest, { params }: { params: { id: string; unitId: string } }) => {
    try {
        const { uid: landlordId } = req.user;
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
}, ['landlord']);
