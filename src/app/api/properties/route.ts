
import { NextResponse } from 'next/server';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import type { Property, Unit } from '@/lib/types';
import { toJSON } from '@/lib/utils';
import { authConfig } from '@/config/server-config';

export const runtime = 'nodejs';

export async function GET(request: any) {
    const requestId = crypto.randomUUID();
    
    try {
        console.log(`[DEBUG][${requestId}] Properties API called`);
        
        if (!isFirebaseAdminInitialized) {
            console.error(`[ERROR][${requestId}] Firebase Admin not initialized`);
            return NextResponse.json({ 
                error: 'Backend services are not configured. Please contact support.' 
            }, { status: 500 });
        }

        // Get session cookie and authenticate
        const sessionCookie = request.cookies.get(authConfig.cookieName)?.value;
        
        if (!sessionCookie) {
            console.warn(`[WARN][${requestId}] No session cookie found`);
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        console.log(`[DEBUG][${requestId}] Authenticating user`);
        const { getLandlordAndActor } = await import('@/lib/auth-utils');
        const { landlordId, actor, error: authError } = await getLandlordAndActor(sessionCookie);
        
        if (authError || !landlordId) {
            console.warn(`[WARN][${requestId}] Auth failed:`, authError?.message);
            return NextResponse.json({ 
                error: authError?.message || 'Unauthorized' 
            }, { status: authError?.statusCode || 401 });
        }

        console.log(`[INFO][${requestId}] Fetching properties for landlord: ${landlordId}`);

        // Temporarily simplified query to avoid FAILED_PRECONDITION error
        const propertiesSnapshot = await firestore.collection('properties')
            .where('landlordId', '==', landlordId)
            .get();

        console.log(`[INFO][${requestId}] Found ${propertiesSnapshot.docs.length} properties`);
        
        const properties: Property[] = propertiesSnapshot.docs.map(doc => {
            const propertyData = { id: doc.id, ...doc.data() } as Property;
            // Return empty units array to avoid collectionGroup query for now
            propertyData.units = []; 
            return propertyData;
        }).sort((a, b) => {
            const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
            const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
            return bTime - aTime;
        });

        const totalUnits = 0; // Not fetching units for now
        const occupiedUnits = 0;

        console.log(`[INFO][${requestId}] Returning ${properties.length} properties`);

        const response = {
            properties: toJSON(properties),
            meta: {
                totalProperties: properties.length,
                totalUnits,
                occupiedUnits,
                occupancyRate: 0
            }
        };

        return NextResponse.json(response);

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
