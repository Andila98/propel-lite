
import { type NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase-admin';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const propertyId = params.id;
    const propertyDoc = await firestore.collection('properties').doc(propertyId).get();

    if (!propertyDoc.exists) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }
    
    const unitsSnapshot = await propertyDoc.ref.collection('units').get();
    const units = unitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const propertyWithUnits = {
        id: propertyDoc.id,
        ...propertyDoc.data(),
        units: units
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

    // TODO: Add validation with Zod schema
    
    await firestore.collection('properties').doc(propertyId).update(updates);
    
    return NextResponse.json({ message: 'Property updated successfully' });
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
    const propertyRef = firestore.collection('properties').doc(propertyId);
    
    // In a real app, you might want to delete subcollections in a more robust way
    // (e.g., using a Firebase Function) as direct deletion of subcollections
    // isn't supported in the client/admin SDKs directly for nested data.
    // For now, we delete the main document.
    await propertyRef.delete();
    
    return NextResponse.json({ message: 'Property deleted successfully' });
  } catch (error: any) {
    console.error(`[PROPERTY_DELETE_ERROR] for ID ${params.id}:`, error);
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}
