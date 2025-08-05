
import { type NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/lib/firebase-admin';
import { verifyFirebaseToken } from '@/lib/server-utils';

export async function POST(req: NextRequest) {
  try {
    const { userId, role } = await verifyFirebaseToken(req);

    if (role !== 'landlord') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { address, propertyType, imageUrl, units, description, currency, rent, bedrooms, bathrooms, squareFootage } = await req.json();

    if (!address || !propertyType || !Array.isArray(units)) {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
    }

    const newProperty = {
      landlordId: userId,
      address,
      propertyType,
      imageUrl: imageUrl || '',
      units,
      description,
      currency: currency || 'KES',
      rent,
      bedrooms,
      bathrooms,
      squareFootage,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const propertyRef = await db.collection('properties').add(newProperty);

    return NextResponse.json({ message: 'Property created', propertyId: propertyRef.id }, { status: 201 });
  } catch (error: any) {
    console.error('[PROPERTY_CREATE_ERROR]', error);
    if (error.message.includes('No auth token provided')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
