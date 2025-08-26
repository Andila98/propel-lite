
import { NextResponse, type NextRequest } from 'next/server';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import type { Property, Unit } from '@/lib/types';
import { toJSON } from '@/lib/utils';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    if (!isFirebaseAdminInitialized) {
        return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 500 });
    }
    try {
        const [propertiesSnapshot, unitsSnapshot] = await Promise.all([
            firestore.collection('properties').get(),
            firestore.collectionGroup('units').get()
        ]);

        const unitsByPropertyId = new Map<string, Unit[]>();
        unitsSnapshot.docs.forEach(doc => {
            const unit = { id: doc.id, ...doc.data() } as Unit;
            const propertyId = doc.ref.parent.parent?.id;
            if (propertyId) {
                if (!unitsByPropertyId.has(propertyId)) {
                    unitsByPropertyId.set(propertyId, []);
                }
                unitsByPropertyId.get(propertyId)!.push(unit);
            }
        });
        
        const properties: Property[] = propertiesSnapshot.docs.map(doc => {
            const propertyData = { id: doc.id, ...doc.data() } as Property;
            propertyData.units = unitsByPropertyId.get(doc.id) || [];
            return propertyData;
        });
        
        return NextResponse.json(toJSON(properties));

    } catch (error: any) {
        console.error('[ERROR: /api/properties GET]', error);
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}
