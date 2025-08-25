
import { NextResponse, type NextRequest } from 'next/server';
import { firestore } from '@/lib/firebase-admin';
import type { Property } from '@/lib/types';
import { toJSON } from '@/lib/utils';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    try {
        const propertiesSnapshot = await firestore.collection('properties').get();
        
        const properties = await Promise.all(
            propertiesSnapshot.docs.map(async doc => {
                const propertyData = { id: doc.id, ...doc.data() } as Property;
                const unitsSnapshot = await doc.ref.collection('units').get();
                propertyData.units = unitsSnapshot.docs.map(unitDoc => ({ id: unitDoc.id, ...unitDoc.data() } as any));
                return propertyData;
            })
        );
        
        return NextResponse.json(toJSON(properties));

    } catch (error: any) {
        console.error('[API_PROPERTIES_GET_ERROR]', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
