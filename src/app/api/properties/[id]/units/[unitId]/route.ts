
import { type NextRequest, NextResponse } from 'next/server';
import { propertyService } from '@/services/property-service';
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

    await propertyService.updateUnitInProperty(propertyId, unitId, updates, landlordId);

    return NextResponse.json({ message: 'Unit updated successfully' });
  } catch (error: any) {
    console.error(`[UPDATE_UNIT_ERROR] for property ${params.id}, unit ${params.unitId}:`, error);
    if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Unauthorized or property not found' }, { status: 403 });
    }
    if (error.message.includes('not found')) {
        return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
    }
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

        await propertyService.deleteUnitFromProperty(propertyId, unitId, landlordId);

        return NextResponse.json({ message: 'Unit deleted successfully' });
    } catch (error: any) {
        console.error(`[DELETE_UNIT_ERROR] for property ${params.id}, unit ${params.unitId}:`, error);
        if (error.message.includes('Unauthorized')) {
            return NextResponse.json({ error: 'Unauthorized or property not found' }, { status: 403 });
        }
        if (error.message.includes('not found')) {
            return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
        }
        if (error.message.includes('occupied')) {
            return NextResponse.json({ error: error.message }, { status: 409 });
        }
        return NextResponse.json({ error: 'Failed to delete unit' }, { status: 500 });
    }
}
