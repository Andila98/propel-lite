
import { type NextRequest, NextResponse } from 'next/server';
import { propertyService } from '@/services/property-service';
import { verifyApiAuth } from '@/lib/server-utils';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { decodedToken, error } = await verifyApiAuth(req, ['landlord']);
    if (error) return error;

    const { uid: landlordId } = decodedToken;
    const propertyId = params.id;
    const unitData = await req.json();

    if (!unitData.unitNumber || !unitData.rent) {
        return NextResponse.json({ error: 'Missing or invalid unit data' }, { status: 400 });
    }

    const newUnit = await propertyService.addUnitToProperty(propertyId, unitData, landlordId);

    return NextResponse.json({ message: 'Unit added successfully', unitId: newUnit.id }, { status: 201 });
  } catch (error: any) {
    console.error(`[ADD_UNIT_ERROR] for property ${params.id}:`, error);
    if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Unauthorized or property not found' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to add unit' }, { status: 500 });
  }
}
