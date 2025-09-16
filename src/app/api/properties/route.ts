
import { NextResponse, type NextRequest } from 'next/server';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import type { Property, Unit } from '@/lib/types';
import { toJSON } from '@/lib/utils';
import { authConfig } from '@/config/server-config';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    const requestId = crypto.randomUUID();
    
    try {
        if (!isFirebaseAdminInitialized) {
            console.error(`[ERROR][${requestId}] Firebase Admin not initialized`);
            return NextResponse.json({ 
                error: 'Backend services are not configured. Please contact support.' 
            }, { status: 500 });
        }

        const sessionCookie = request.cookies.get(authConfig.cookieName)?.value;
        if (!sessionCookie) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { getLandlordAndActor } = await import('@/lib/auth-utils');
        const { landlordId, error: authError } = await getLandlordAndActor(sessionCookie);
        
        if (authError || !landlordId) {
            return NextResponse.json({ 
                error: authError?.message || 'Unauthorized' 
            }, { status: authError?.statusCode || 401 });
        }

        console.log(`[INFO][${requestId}] Fetching properties for landlord: ${landlordId}`);

        const propertiesSnapshot = await firestore.collection('properties')
            .where('landlordId', '==', landlordId)
            .orderBy('createdAt', 'desc')
            .get();
        
        const propertiesPromises = propertiesSnapshot.docs.map(async (doc) => {
            const propertyData = { id: doc.id, ...doc.data() } as Property;
            
            const unitsSnapshot = await doc.ref.collection('units').get();
            propertyData.units = unitsSnapshot.docs.map(unitDoc => ({ id: unitDoc.id, ...unitDoc.data() } as Unit));
            
            return propertyData;
        });

        const properties = await Promise.all(propertiesPromises);
        
        return NextResponse.json(toJSON(properties));

    } catch (error: any) {
        console.error(`[ERROR][${requestId}] Properties API failed:`, {
            name: error.name,
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
        
        return NextResponse.json({ 
            error: 'Failed to fetch properties. Please try again later.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: 500 });
    }
}
