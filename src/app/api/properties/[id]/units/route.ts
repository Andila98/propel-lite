
import { type NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/lib/firebase-admin';
import { verifyFirebaseToken } from '@/lib/server-utils';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId, role } = await verifyFirebaseToken(req);
    const propertyId = params.id;
    const unitData = await req.json();

    if (role !== 'landlord') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!unitData.unitNumber || !unitData.unitType || !unitData.rent) {
        return NextResponse.json({ error: 'Missing or invalid unit data' }, { status: 400 });
    }

    const propertyRef = db.collection('properties').doc(propertyId);
    const propertyDoc = await propertyRef.get();

    if (!propertyDoc.exists || propertyDoc.data()?.landlordId !== userId) {
      return NextResponse.json({ error: 'Unauthorized or not found' }, { status: 403 });
    }

    // Add the new unit to the 'units' array on the property document.
    await propertyRef.update({
      units: admin.firestore.FieldValue.arrayUnion({
        ...unitData,
        isAvailable: unitData.isAvailable ?? true, // Default to available
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    });

    return NextResponse.json({ message: 'Unit added successfully' }, { status: 201 });
  } catch (error: any) {
    console.error(`[ADD_UNIT_ERROR] for property ${params.id}:`, error);
     if (error.message.includes('No auth token provided')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to add unit' }, { status: 500 });
  }
}
