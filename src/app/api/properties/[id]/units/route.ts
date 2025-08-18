
import { type NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const propertyId = params.id;
    const unitData = await req.json();
    const newUnitId = uuid();
    console.log(`Mock add unit to property ${propertyId} with data:`, unitData);
    return NextResponse.json({ message: 'Unit added successfully (mock)', unitId: newUnitId }, { status: 201 });
  } catch (error: any) {
    console.error(`[ADD_UNIT_ERROR] for property ${params.id}:`, error);
    return NextResponse.json({ error: 'Failed to add unit' }, { status: 500 });
  }
}
