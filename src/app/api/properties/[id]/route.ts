
import { type NextRequest, NextResponse } from 'next/server';
import { mockProperties, mockUnits } from '@/lib/mock-data';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const propertyId = params.id;
    const property = mockProperties.find(p => p.id === propertyId);

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }
    
    // Attach units to the property
    const propertyWithUnits = {
        ...property,
        units: mockUnits.filter(u => u.propertyId === propertyId)
    };

    return NextResponse.json(propertyWithUnits);
    
  } catch (error: any) {
    console.error(`API Error: Failed to fetch property ${params.id}:`, error);
    return NextResponse.json(
      { error: `Failed to fetch property: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const propertyId = params.id;
    const updates = await req.json();
    console.log(`Mock update for property ${propertyId} with data:`, updates);
    return NextResponse.json({ message: 'Property updated successfully (mock)' });
  } catch (error: any) {
    console.error(`[PROPERTY_UPDATE_ERROR] for ID ${params.id}:`, error);
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const propertyId = params.id;
    console.log(`Mock delete for property ${propertyId}`);
    return NextResponse.json({ message: 'Property deleted successfully (mock)' });
  } catch (error: any) {
    console.error(`[PROPERTY_DELETE_ERROR] for ID ${params.id}:`, error);
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}
