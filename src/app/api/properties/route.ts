
import { type NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase-admin';
import type { Property, Unit } from '@/lib/types';


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
        
        return {
          id: doc.id,
          ...propertyData,
          units: units,
          createdAt: (propertyData.createdAt as any)?.toDate ? (propertyData.createdAt as any).toDate() : new Date(),
        };
      }));

    return NextResponse.json(properties);

  } catch (error: any) {
    console.error('[PROPERTIES_GET_ERROR]', error);
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}
