
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const propertyId = params.id;
    if (!propertyId) {
        return NextResponse.json({ error: 'Property ID is required' }, { status: 400 });
    }

    const propertyDoc = await db.collection('properties').doc(propertyId).get();

    if (!propertyDoc.exists) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const property = { id: propertyDoc.id, ...propertyDoc.data() };
    return NextResponse.json(property);
    
  } catch (error: any) {
    console.error(`API Error: Failed to fetch property ${params.id}:`, error);
    return NextResponse.json(
      { error: `Failed to fetch property: ${error.message}` },
      { status: 500 }
    );
  }
}
