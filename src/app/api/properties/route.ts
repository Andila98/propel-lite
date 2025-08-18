
import { type NextRequest, NextResponse } from 'next/server';
import { mockProperties, mockUnits } from '@/lib/mock-data';

export async function GET(req: NextRequest) {
  try {
    // Attach units to each property
    const propertiesWithUnits = mockProperties.map(prop => ({
        ...prop,
        units: mockUnits.filter(unit => unit.propertyId === prop.id)
    }));
    return NextResponse.json(propertiesWithUnits);
  } catch (error: any) {
    console.error('[PROPERTIES_GET_ERROR]', error);
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}
