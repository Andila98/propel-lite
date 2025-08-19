
import { type NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase-admin';

export async function PUT(req: NextRequest, { params }: { params: { id: string; unitId: string } }) {
  try {
    const { id: propertyId, unitId } = params;
    const updates = await req.json();

    // TODO: Add Zod validation
    const unitRef = firestore.collection('properties').doc(propertyId).collection('units').doc(unitId);
    
    await unitRef.update(updates);
    
    return NextResponse.json({ message: 'Unit updated successfully' });
  } catch (error: any) {
    console.error(`[UPDATE_UNIT_ERROR] for property ${params.id}, unit ${params.unitId}:`, error);
    return NextResponse.json({ error: 'Failed to update unit' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string; unitId: string } }) {
    try {
        const { id: propertyId, unitId } = params;
        const unitRef = firestore.collection('properties').doc(propertyId).collection('units').doc(unitId);

        await unitRef.delete();

        return NextResponse.json({ message: 'Unit deleted successfully' });
    } catch (error: any) {
        console.error(`[DELETE_UNIT_ERROR] for property ${params.id}, unit ${params.unitId}:`, error);
        return NextResponse.json({ error: 'Failed to delete unit' }, { status: 500 });
    }
}
