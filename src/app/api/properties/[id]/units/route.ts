
import { type NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase-admin';
import { UnitSchema } from '@/lib/schemas'; // Reusing the schema for validation

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const propertyId = params.id;
    const unitData = await req.json();

    // Validate the incoming data
    const validationResult = UnitSchema.safeParse(unitData);
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid unit data', details: validationResult.error.flatten() }, { status: 400 });
    }
    
    const propertyRef = firestore.collection('properties').doc(propertyId);
    const newUnitRef = propertyRef.collection('units').doc();
    
    await newUnitRef.set(validationResult.data);
    
    const newUnit = { id: newUnitRef.id, ...validationResult.data };

    return NextResponse.json(newUnit, { status: 201 });
  } catch (error: any) {
    console.error(`[ADD_UNIT_ERROR] for property ${params.id}:`, error);
    return NextResponse.json({ error: 'Failed to add unit' }, { status: 500 });
  }
}
