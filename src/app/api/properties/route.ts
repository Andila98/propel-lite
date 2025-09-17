
import { NextResponse } from 'next/server';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { authConfig } from '@/config/server-config';

export const runtime = 'nodejs';

export async function GET(request: any) {
    const requestId = crypto.randomUUID();
    
    try {
        console.log(`[DEBUG][${requestId}] Properties API called`);
        
        if (!isFirebaseAdminInitialized) {
            console.error(`[ERROR][${requestId}] Firebase Admin not initialized`);
            return NextResponse.json({ 
                error: 'Firebase not configured' 
            }, { status: 503 });
        }

        const sessionCookie = request.cookies.get(authConfig.cookieName)?.value;
        if (!sessionCookie) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        console.log(`[DEBUG][${requestId}] Testing basic Firestore connection...`);
        
        // Test 1: Simple collection access
        const testCollection = firestore.collection('properties');
        console.log(`[DEBUG][${requestId}] Collection reference created successfully`);
        
        // Test 2: Simple query without where clause
        const allPropsSnapshot = await testCollection.limit(1).get();
        console.log(`[DEBUG][${requestId}] Basic query successful, found ${allPropsSnapshot.docs.length} docs`);
        
        // Test 3: Authentication
        const { getLandlordAndActor } = await import('@/lib/auth-utils');
        const { landlordId, error: authError } = await getLandlordAndActor(sessionCookie);
        
        if (authError || !landlordId) {
            return NextResponse.json({ error: 'Auth failed' }, { status: 401 });
        }
        
        console.log(`[DEBUG][${requestId}] Auth successful for landlord: ${landlordId}`);
        
        // Test 4: Query with where clause
        console.log(`[DEBUG][${requestId}] Testing where query...`);
        const filteredSnapshot = await testCollection
            .where('landlordId', '==', landlordId)
            .limit(1)
            .get();
            
        console.log(`[DEBUG][${requestId}] Where query successful, found ${filteredSnapshot.docs.length} matching docs`);
        
        // Return the actual data if we get this far
        const properties = filteredSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            units: [] // Skip units for now
        }));

        const response = {
            properties,
            meta: {
                totalProperties: properties.length,
                totalUnits: 0,
                occupiedUnits: 0,
                occupancyRate: 0
            },
            debug: {
                landlordId,
                totalDocsInCollection: allPropsSnapshot.docs.length,
                matchingDocs: filteredSnapshot.docs.length
            }
        };

        return NextResponse.json(response);

    } catch (error: any) {
        console.error(`[ERROR][${requestId}] Detailed error info:`, {
            name: error.name,
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        
        return NextResponse.json({ 
            error: 'Firestore query failed',
            details: error.message,
            errorCode: error.code
        }, { status: 500 });
    }
}
