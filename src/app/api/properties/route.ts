
import { type NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase-admin';
import { logActivity } from '@/lib/audit-log-service';
import type { Property, Unit } from '@/lib/types';
import { PropertyFormSchema } from '@/lib/schemas';
import { FieldValue } from 'firebase-admin/firestore';


export async function GET(req: NextRequest) {
  try {
    const propertiesSnapshot = await firestore.collection('properties').get();
    if (propertiesSnapshot.empty) {
      return NextResponse.json([]);
    }
    const properties = await Promise.all(propertiesSnapshot.docs.map(async (doc) => {
        const propertyData = doc.data() as Omit<Property, 'id' | 'units'>;
        
        const unitsSnapshot = await doc.ref.collection('units').get();
        const units = unitsSnapshot.docs.map(unitDoc => ({ id: unitDoc.id, ...unitDoc.data() })) as Unit[];
        
        const createdAt = (propertyData.createdAt as any)?.toDate ? (propertyData.createdAt as any).toDate() : new Date();

        return {
          id: doc.id,
          ...propertyData,
          units: units,
          createdAt: createdAt.toISOString(),
        };
      }));

    return NextResponse.json(properties);

  } catch (error: any) {
    console.error('[PROPERTIES_GET_ERROR]', error);
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validationResult = PropertyFormSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid property data', details: validationResult.error.flatten() }, { status: 400 });
    }
    
    const { units, ...mainPropertyData } = validationResult.data;
    
    const propertyRef = firestore.collection('properties').doc();
    
    await firestore.runTransaction(async (transaction) => {
        transaction.set(propertyRef, {
            ...mainPropertyData,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            // In a real multi-user app, this would come from the authenticated user's session
            landlordId: 'default_landlord_id' 
        });

        units.forEach(unit => {
            const unitRef = propertyRef.collection('units').doc();
            transaction.set(unitRef, unit);
        });
    });

    // TODO: Get actor name from session
    await logActivity('Admin', `Created property "${mainPropertyData.name}"`, { type: 'Property', name: mainPropertyData.name });

    return NextResponse.json({ id: propertyRef.id, ...validationResult.data }, { status: 201 });

  } catch (error: any) {
    console.error('[PROPERTY_CREATE_ERROR]', error);
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}
