
import { type NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/lib/firebase-admin';
import { withRole, type AuthenticatedRequest } from '@/lib/middleware/withRole';
import { v4 as uuid } from 'uuid';

export const POST = withRole(async (req: AuthenticatedRequest, { params }: { params: { id: string } }) => {
  try {
    const { uid: landlordId } = req.user;
    const propertyId = params.id;
    const unitData = await req.json();

    if (!unitData.unitNumber || !unitData.rent) {
        return NextResponse.json({ error: 'Missing or invalid unit data' }, { status: 400 });
    }

    const propertyRef = db.collection('properties').doc(propertyId);
    const propertyDoc = await propertyRef.get();

    if (!propertyDoc.exists || propertyDoc.data()?.landlordId !== landlordId) {
      return NextResponse.json({ error: 'Unauthorized or not found' }, { status: 403 });
    }

    const unitId = uuid();
    const newUnit = {
        id: unitId,
        ...unitData,
        isOccupied: unitData.isOccupied ?? false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    // Add the new unit to the 'units' subcollection.
    await propertyRef.collection('units').doc(unitId).set(newUnit);

    return NextResponse.json({ message: 'Unit added successfully', unitId }, { status: 201 });
  } catch (error: any) {
    console.error(`[ADD_UNIT_ERROR] for property ${params.id}:`, error);
    return NextResponse.json({ error: 'Failed to add unit' }, { status: 500 });
  }
}, ['landlord']);
