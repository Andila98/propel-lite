import { type NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/lib/firebase-admin';
import { PropertyFormSchema } from '@/lib/schemas';
import { propertyService } from '@/services/property-service';
import { verifyApiAuth } from '@/lib/server-utils';


async function checkAuth(req: NextRequest, allowedRoles: string[] = ['landlord']) {
    const { tokens, error } = await verifyApiAuth(req, allowedRoles);
    if (error) {
        return { tokens: null, response: error };
    }
    return { tokens, response: null };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { tokens, response } = await checkAuth(req);
    if (response) return response;

    const userId = tokens!.decodedToken.uid;
    const propertyId = params.id;

    if (!propertyId) {
        return NextResponse.json({ error: 'Property ID is required' }, { status: 400 });
    }
    
    const property = await propertyService.getPropertyById(propertyId, userId);

    if (!property) {
      return NextResponse.json({ error: 'Property not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json(property);
    
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
    const { tokens, response } = await checkAuth(req);
    if (response) return response;
    
    const userId = tokens!.decodedToken.uid;
    const propertyId = params.id;
    
    const updates = await req.json();

    const ref = db.collection('properties').doc(propertyId);
    const doc = await ref.get();

    if (!doc.exists || doc.data()?.landlordId !== userId) {
      return NextResponse.json({ error: 'Unauthorized or not found' }, { status: 403 });
    }

    delete updates.landlordId;
    delete updates.createdAt;
    
    await ref.update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return NextResponse.json({ message: 'Property updated' });
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
    const { tokens, response } = await checkAuth(req);
    if (response) return response;

    const userId = tokens!.decodedToken.uid;
    const propertyId = params.id;

    const ref = db.collection('properties').doc(propertyId);
    const doc = await ref.get();

    if (!doc.exists || doc.data()?.landlordId !== userId) {
      return NextResponse.json({ error: 'Unauthorized or not found' }, { status: 403 });
    }

    await ref.delete();

    return NextResponse.json({ message: 'Property deleted successfully' });
  } catch (error: any) {
    console.error(`[PROPERTY_DELETE_ERROR] for ID ${params.id}:`, error);
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}
