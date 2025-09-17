
import { NextResponse, type NextRequest } from 'next/server';
import { authConfig } from '@/config/server-config';

export const runtime = 'nodejs';

export async function GET(request: any) {
    try {
        console.log('[DEBUG] Dashboard API called');
        
        // Test Firebase Admin import
        console.log('[DEBUG] Importing Firebase Admin...');
        const { firestore, isFirebaseAdminInitialized } = await import('@/lib/firebase-admin');
        
        if (!isFirebaseAdminInitialized) {
            console.log('[DEBUG] Firebase Admin not initialized');
            return NextResponse.json({ error: 'Firebase not configured' }, { status: 503 });
        }
        
        console.log('[DEBUG] Firebase Admin initialized successfully');
        
        // Get session cookie
        const sessionCookie = request.cookies.get(authConfig.cookieName)?.value;
        
        if (!sessionCookie) {
            console.log('[DEBUG] No session cookie');
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
        
        console.log('[DEBUG] Session cookie found, importing auth utils...');
        
        // Test auth utils import
        const { getLandlordAndActor } = await import('@/lib/auth-utils');
        
        console.log('[DEBUG] Testing authentication...');
        const { landlordId, actor, error: authError } = await getLandlordAndActor(sessionCookie);
        
        if (authError || !landlordId) {
            console.log('[DEBUG] Auth failed:', authError?.message);
            return NextResponse.json({ 
                error: authError?.message || 'Authentication failed' 
            }, { status: 401 });
        }
        
        console.log('[DEBUG] Auth successful for landlord:', landlordId);

        // Add this before any Firestore queries
        try {
            console.log(`[DEBUG] Testing Firestore connection...`);
            const testQuery = await firestore.collection('properties').limit(1).get();
            console.log(`[DEBUG] Basic Firestore test successful, found ${testQuery.docs.length} docs`);
        } catch (testError: any) {
            console.error(`[DEBUG] Firestore test failed:`, testError);
            throw new Error(`Firestore connection failed: ${testError.message}`);
        }
        
        // Start with basic Firestore queries
        console.log('[DEBUG] Querying Firestore...');
        
        const propertiesSnapshot = await firestore.collection('properties')
            .where('landlordId', '==', landlordId)
            .limit(5)  // Start with just 5 to test
            .get();
            
        console.log('[DEBUG] Properties query result:', propertiesSnapshot.docs.length, 'properties found');
        
        const tenantsCountSnapshot = await firestore.collection('tenants')
            .where('landlordId', '==', landlordId)
            .count()
            .get();
            
        console.log('[DEBUG] Tenants count:', tenantsCountSnapshot.data().count);
        
        // Process the data
        const properties = propertiesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        const totalTenants = tenantsCountSnapshot.data().count;
        
        const dashboardData = {
            totalProperties: properties.length,
            totalTenants,
            totalRevenue: 125000, // Mock for now
            revenueChange: 0.12,
            occupancyRate: totalTenants > 0 ? 75 : 0,
            properties: properties.slice(0, 3), // Show first 3
            anomalyAlerts: [
                {
                    id: 'alert1',
                    type: 'info',
                    description: 'Dashboard is working with real data!',
                    date: '1 minute ago'
                }
            ],
            aiSummary: `Found ${properties.length} properties and ${totalTenants} tenants for landlord ${landlordId}`,
            latePaymentData: [
                { month: 'Jan', latePayments: 2 },
                { month: 'Feb', latePayments: 1 },
                { month: 'Mar', latePayments: 3 }
            ],
            paymentMethodData: [
                { name: 'Mpesa', value: 60, fill: 'hsl(var(--chart-1))' },
                { name: 'Bank', value: 40, fill: 'hsl(var(--chart-2))' }
            ]
        };
        
        console.log('[DEBUG] Returning dashboard data');
        return NextResponse.json(dashboardData);
        
    } catch (error: any) {
        console.error('[ERROR] Dashboard failed:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        return NextResponse.json({ 
            error: 'Internal server error',
            details: error.message 
        }, { status: 500 });
    }
}
