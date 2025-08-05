
import { type NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/lib/firebase-admin';
import { withRole, type AuthenticatedRequest } from '@/lib/middleware/withRole';
import type { Property, Unit } from '@/lib/types';

export const PUT = withRole(async (req: AuthenticatedRequest, { params }: { params: { id: string; unitId: string } }) => {
  try {
    const { uid: userId } = req.user;
    const propertyId = params.id;
    // Note: In our array structure, we'll use the unitNumber as the identifier.
    // A more robust solution might add a unique ID to each unit object.
    const unitId = params.unitId; 
    const updates = await req.json();

    const propertyRef = db.collection('properties').doc(propertyId);
    const propertyDoc = await propertyRef.get();

    if (!propertyDoc.exists || propertyDoc.data()?.landlordId !== userId) {
      return NextResponse.json({ error: 'Unauthorized or property not found' }, { status: 403 });
    }

    const propertyData = propertyDoc.data() as Property;
    const units = propertyData.units || [];
    
    let unitFound = false;
    const updatedUnits = units.map((unit: Unit) => {
        // We're using unitNumber as the unique key for this operation.
        if (unit.unitNumber === unitId) {
            unitFound = true;
            return { ...unit, ...updates };
        }
        return unit;
    });

    if (!unitFound) {
        return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
    }

    await propertyRef.update({
      units: updatedUnits,
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
        const { uid: userId } = req.user;
        const propertyId = params.id;
        const unitId = params.unitId;

        const propertyRef = db.collection('properties').doc(propertyId);
        const propertyDoc = await propertyRef.get();

        if (!propertyDoc.exists || propertyDoc.data()?.landlordId !== userId) {
            return NextResponse.json({ error: 'Unauthorized or property not found' }, { status: 403 });
        }
        
        const propertyData = propertyDoc.data() as Property;
        const unitToDelete = propertyData.units?.find((unit: Unit) => unit.unitNumber === unitId);

        if (!unitToDelete) {
            return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
        }

        await propertyRef.update({
            units: admin.firestore.FieldValue.arrayRemove(unitToDelete),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return NextResponse.json({ message: 'Unit deleted successfully' });
    } catch (error: any) {
        console.error(`[DELETE_UNIT_ERROR] for property ${params.id}, unit ${params.unitId}:`, error);
        return NextResponse.json({ error: 'Failed to delete unit' }, { status: 500 });
    }
}, ['landlord']);
