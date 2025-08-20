
import { type NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase-admin';
import { logActivity } from '@/lib/audit-log-service';
import { PropertyFormSchema } from '@/lib/schemas';

async function deleteCollection(collectionRef: FirebaseFirestore.CollectionReference, batchSize: number) {
    const query = collectionRef.limit(batchSize);
    let deleted = 0;

    while (true) {
        const snapshot = await query.get();
        if (snapshot.size === 0) {
            return { totalDeleted: deleted };
        }

        const batch = firestore.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        deleted += snapshot.size;
        console.log(`[DELETE_COLLECTION] Deleted ${deleted} documents...`);
    }
}


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

    // Validate the incoming data
    const validationResult = PropertyFormSchema.partial().safeParse(updates);
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid property data', details: validationResult.error.flatten() }, { status: 400 });
    }
    
    await firestore.collection('properties').doc(propertyId).update(validationResult.data);
    console.log(`[PROPERTY_UPDATE] Successfully updated property ${propertyId}.`);
    
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
    
    const propertyDoc = await propertyRef.get();
    if (!propertyDoc.exists) {
        return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }
    const propertyData = propertyDoc.data();
    
    // Delete all units in the subcollection first
    const unitsRef = propertyRef.collection('units');
    console.log(`[PROPERTY_DELETE] Deleting units for property ${propertyId}...`);
    await deleteCollection(unitsRef, 50); // Batch delete units

    // Then delete the property document itself
    await propertyRef.delete();
    console.log(`[PROPERTY_DELETE] Successfully deleted property ${propertyId}.`);
    
    // TODO: Get actor name from session
    await logActivity('Admin', `Deleted property "${propertyData?.name}"`, { type: 'Property', name: propertyData?.name || propertyId });

    return NextResponse.json({ message: 'Property deleted successfully' });
  } catch (error: any) {
    console.error(`[PROPERTY_DELETE_ERROR] for ID ${params.id}:`, error);
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}
