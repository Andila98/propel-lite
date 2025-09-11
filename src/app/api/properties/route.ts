
import { NextResponse, type NextRequest } from 'next/server';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import type { Property, Unit } from '@/lib/types';
import { toJSON } from '@/lib/utils';
import { authConfig } from '@/config/server-config';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
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

        // Query properties and units in parallel for better performance
        const [propertiesSnapshot, unitsSnapshot] = await Promise.all([
            firestore.collection('properties')
                .where('landlordId', '==', landlordId)
                .orderBy('createdAt', 'desc')
                .get(),
            firestore.collectionGroup('units')
                .where('landlordId', '==', landlordId)
                .get()
        ]);

        console.log(`[INFO][${requestId}] Found ${propertiesSnapshot.docs.length} properties and ${unitsSnapshot.docs.length} units`);

        // Group units by property ID for efficient lookup
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

        // Build properties array with units and calculated fields
        const properties: Property[] = propertiesSnapshot.docs.map(doc => {
            const propertyData = { id: doc.id, ...doc.data() } as Property;
            const units = unitsByPropertyId.get(doc.id) || [];
            
            // Attach units to property
            propertyData.units = units;
            
            // Calculate derived fields for display
            if (units.length > 0) {
                // Set rent range or single rent
                const rents = units.map(u => u.rent).filter(r => r > 0);
                if (rents.length > 0) {
                    propertyData.rent = Math.min(...rents); // Use minimum rent for sorting
                }
                
                // Estimate bedrooms from first unit's size
                const firstUnit = units[0];
                const bedroomMatch = firstUnit.size.match(/(\d+)\s*(bedroom|bed|br)/i);
                propertyData.bedrooms = bedroomMatch ? parseInt(bedroomMatch[1]) : 1;
                
                // Default bathroom count (you might want to add this to your schema)
                propertyData.bathrooms = propertyData.bedrooms || 1;
            } else {
                // Default values for properties without units
                propertyData.rent = 0;
                propertyData.bedrooms = 0;
                propertyData.bathrooms = 0;
            }
            
            return propertyData;
        });

        // Add some useful metadata
        const occupiedUnits = properties.reduce((count, prop) => 
            count + (prop.units?.filter(u => u.isOccupied).length || 0), 0
        );
        const totalUnits = properties.reduce((count, prop) => 
            count + (prop.units?.length || 0), 0
        );

        console.log(`[INFO][${requestId}] Returning ${properties.length} properties with ${occupiedUnits}/${totalUnits} occupied units`);

        // Just return the properties array
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
