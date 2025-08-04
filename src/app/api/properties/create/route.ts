import { NextRequest,NextResponse } from "next/server";
import { firestore } from "firebase-admin";
import { verifyFirebaseToken } from '@/lib/utils';


export async function POST(req: NextRequest) {
    try {
      const { userId, role } = await verifyFirebaseToken(req);
  
      if (role !== 'landlord') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
  
      const { name, type, address, imageUrl, units } = await req.json();
  
      if (!name || !type || !address || !Array.isArray(units)) {
        return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
      }
  
      const propertyRef = await firestore.collection('properties').add({
        landlordId: userId,
        name,
        type,
        address,
        imageUrl: imageUrl || '',
        createdAt: Date.now()
      });
  
      // Save units in a subcollection
      const batch = firestore.batch();
      units.forEach(unit => {
        const unitRef = propertyRef.collection('units').doc();
        batch.set(unitRef, {
          ...unit,
          status: 'vacant',
          createdAt: Date.now()
        });
      });
      await batch.commit();
  
      return NextResponse.json({ message: 'Property created', propertyId: propertyRef.id });
    } catch (error: any) {
      console.error('[PROPERTY_CREATE_ERROR]', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  }