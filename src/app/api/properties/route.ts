
import { NextResponse, type NextRequest } from 'next/server';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { getLandlordAndActor } from '@/lib/auth-utils';
import { toJSON } from '@/lib/utils';
import type { Property, Unit } from '@/lib/types';
import { authConfig } from '@/config/server-config';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    if (!isFirebaseAdminInitialized) {
        return NextResponse.json({ error: 'Backend services are not configured' }, { status: 503 });
    }

    const sessionCookie = request.cookies.get(authConfig.cookieName)?.value;
    if (!sessionCookie) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const { landlordId, error: authError } = await getLandlordAndActor(sessionCookie);

    if (authError || !landlordId) {
        return NextResponse.json({ error: authError?.message || 'Unauthorized' }, { status: authError?.statusCode || 401 });
    }

    try {
        const propertiesSnapshot = await firestore.collection('properties')
            .where('landlordId', '==', landlordId)
            .get();
        
        const properties: Property[] = propertiesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Property));

        const unitsPromises = properties.map(p => 
            firestore.collection('properties').doc(p.id).collection('units').get()
        );
        const unitsSnapshots = await Promise.all(unitsPromises);

        properties.forEach((p, index) => {
            p.units = unitsSnapshots[index].docs.map(unitDoc => ({ id: unitDoc.id, ...unitDoc.data() } as Unit));
        });

        // Calculate metadata
        const totalProperties = properties.length;
        const totalUnits = properties.reduce((sum, prop) => sum + prop.units.length, 0);
        const occupiedUnits = properties.reduce((sum, prop) => 
            sum + prop.units.filter(u => u.isOccupied).length, 
        0);
        const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;
        
        const response = {
            properties: toJSON(properties),
            meta: {
                totalProperties,
                totalUnits,
                occupiedUnits,
                occupancyRate,
            }
        };

        return NextResponse.json(response);
    } catch (error: any) {
        console.error('[ERROR: /api/properties]', { message: error.message, stack: error.stack });
        return NextResponse.json({ 
            error: 'Internal server error',
            details: error.message 
        }, { status: 500 });
    }
}
