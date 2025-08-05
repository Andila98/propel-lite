
import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyFirebaseToken } from '@/lib/server-utils';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, role } = await verifyFirebaseToken(req);
    const propertyId = params.id;

    if (!propertyId) {
        return NextResponse.json({ error: 'Property ID is required' }, { status: 400 });
    }
    
    if (role !== 'landlord') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const propertyDoc = await db.collection('properties').doc(propertyId).get();

    if (!propertyDoc.exists || propertyDoc.data()?.landlordId !== userId) {
      return NextResponse.json({ error: 'Property not found or unauthorized' }, { status: 404 });
    }

    const property = { id: propertyDoc.id, ...propertyDoc.data() };
    return NextResponse.json(property);
    
  } catch (error: any) {
    console.error(`API Error: Failed to fetch property ${params.id}:`, error);
     if (error.message.includes('No auth token provided')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: `Failed to fetch property: ${error.message}` },
      { status: 500 }
    );
  }
}
