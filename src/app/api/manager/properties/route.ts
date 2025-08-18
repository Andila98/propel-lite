
import { NextResponse, type NextRequest } from 'next/server';
import { mockProperties, mockPropertyManagers } from '@/lib/mock-data';

export async function GET(req: NextRequest) {
  try {
    // This is a mock implementation since Firebase is removed.
    // It returns properties managed by the first mock manager.
    const manager = mockPropertyManagers[0];
    const managedPropertyIds = manager.propertiesManaged || [];
    const properties = mockProperties.filter(p => managedPropertyIds.includes(p.id));
    
    return NextResponse.json(properties);

  } catch (error: any) {
    console.error(`[MANAGER_PROPERTIES_ERROR]:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
