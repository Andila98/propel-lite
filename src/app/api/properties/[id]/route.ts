
import { type NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/lib/firebase-admin';
import { withRole, type AuthenticatedRequest } from '@/lib/middleware/withRole';
import { PropertyFormSchema } from '@/lib/schemas';

export const GET = withRole(async (
  req: AuthenticatedRequest,
  { params }: { params: { id: string } }
) => {
  try {
    const { uid: userId } = req.user;
    const propertyId = params.id;

    if (!propertyId) {
        return NextResponse.json({ error: 'Property ID is required' }, { status: 400 });
    }
    
    const propertyDoc = await db.collection('properties').doc(propertyId).get();

    if (!propertyDoc.exists || propertyDoc.data()?.landlordId !== userId) {
      return NextResponse.json({ error: 'Property not found or unauthorized' }, { status: 404 });
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
}, ['landlord']);


export const PUT = withRole(async (req: AuthenticatedRequest, { params }: { params: { id: string } }) => {
  try {
    const { uid: userId } = req.user;
    const propertyId = params.id;
    
    const updates = await req.json();

    const ref = db.collection('properties').doc(propertyId);
    const doc = await ref.get();

    if (!doc.exists || doc.data()?.landlordId !== userId) {
      return NextResponse.json({ error: 'Unauthorized or not found' }, { status: 403 });
    }

    // Ensure server-only fields are not updated from client
    delete updates.landlordId;
    delete updates.createdAt;
    
    await ref.update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return NextResponse.json({ message: 'Property updated' });
  } catch (error: any) {
    console.error(`[PROPERTY_UPDATE_ERROR] for ID ${params.id}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, ['landlord']);


export const DELETE = withRole(async (
  req: AuthenticatedRequest,
  { params }: { params: { id: string } }
) => {
  try {
    const { uid: userId } = req.user;
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
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, ['landlord']);
