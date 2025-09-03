
import { NextResponse, type NextRequest } from 'next/server';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import type { Property, Tenant, Payment, DashboardData, ActivityItem, Unit } from '@/lib/types';
import { generateDashboardInsights } from '@/ai/flows/dashboard-insights';
import { sub, format, startOfDay, startOfMonth, endOfMonth } from 'date-fns';
import { toJSON } from '@/lib/utils';
import { getLandlordAndActor } from '@/lib/auth-utils';
import { authConfig } from '@/config/server-config';

export const runtime = 'nodejs';

async function getAnomalyAlerts(landlordId: string): Promise<ActivityItem[]> {
    // This is a mock implementation. A real implementation would involve more complex logic,
    // potentially another Genkit flow, to analyze historical data for anomalies.
    return [];
}

async function getPaymentMethodData(payments: Payment[]): Promise<DashboardData['paymentMethodData']> {
    const methodCounts = payments.reduce((acc, payment) => {
        const method = payment.method || 'Other';
        acc[method] = (acc[method] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const colors: Record<string, string> = {
        'Mpesa': 'hsl(var(--chart-1))',
        'Stripe': 'hsl(var(--chart-2))',
        'Card': 'hsl(var(--chart-3))',
        'Other': 'hsl(var(--chart-4))',
    };

    return Object.entries(methodCounts).map(([name, value]) => ({
        name,
        value,
        fill: colors[name] || colors['Other'],
    }));
}

async function getLatePaymentData(landlordId: string): Promise<DashboardData['latePaymentData']> {
    const data = [];
    const now = new Date();
    // Fetch late payments over the last 6 months
    for (let i = 5; i >= 0; i--) {
        const date = sub(now, { months: i });
        const monthStart = startOfMonth(date);
        const monthEnd = endOfMonth(date);
        
        // This is a simplified query. A more accurate one might check against lease due dates.
        const snapshot = await firestore.collection('payments')
            .where('landlordId', '==', landlordId)
            .where('date', '>', monthStart)
            .where('date', '<=', monthEnd)
            .get();
            
        const latePayments = snapshot.docs.filter(doc => (doc.data().date.toDate() as Date).getDate() > 5).length;
        
        data.push({
            month: format(date, 'MMM'),
            latePayments,
        });
    }
    return toJSON(data);
}

export async function GET(req: NextRequest) {
    const requestId = crypto.randomUUID();
    
    try {
        const sessionCookie = req.cookies.get(authConfig.cookieName)?.value;
        if (!sessionCookie) {
            return NextResponse.json({ error: 'No session' }, { status: 401 });
        }
        
        const { landlordId } = await getLandlordAndActor(sessionCookie);
        if (!landlordId) {
            return NextResponse.json({ error: 'No landlord' }, { status: 401 });
        }
        
        console.log(`[DEBUG] Starting queries for landlord: ${landlordId}`);
        
        const thirtyDaysAgo = startOfDay(sub(new Date(), { days: 30 }));
        
        // Add queries back one by one to isolate the issue
        console.log(`[DEBUG] Fetching properties...`);
        const propertiesSnapshot = await firestore.collection('properties')
            .where('landlordId', '==', landlordId)
            .limit(10)
            .get();
        console.log(`[DEBUG] Properties count: ${propertiesSnapshot.docs.length}`);
        
        console.log(`[DEBUG] Fetching tenant count...`);
        const tenantCountSnapshot = await firestore.collection('tenants')
            .where('landlordId', '==', landlordId)
            .count()
            .get();
        console.log(`[DEBUG] Tenant count: ${tenantCountSnapshot.data().count}`);
        
        console.log(`[DEBUG] Fetching payments...`);
        const paymentsSnapshot = await firestore.collection('payments')
            .where('landlordId', '==', landlordId)
            .where('date', '>=', thirtyDaysAgo)
            .get();
        console.log(`[DEBUG] Payments count: ${paymentsSnapshot.docs.length}`);
        
        console.log(`[DEBUG] Fetching unit count...`);
        const unitCountSnapshot = await firestore.collectionGroup('units')
            .where('landlordId', '==', landlordId)
            .count()
            .get();
        console.log(`[DEBUG] Unit count: ${unitCountSnapshot.data().count}`);
        
        console.log(`[DEBUG] Processing payments data...`);
        const payments = paymentsSnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
        })) as Payment[];
        
        console.log(`[DEBUG] Processing units for properties...`);
        const unitsByPropertyId = new Map();
        for (const propDoc of propertiesSnapshot.docs) {
            console.log(`[DEBUG] Fetching units for property: ${propDoc.id}`);
            const unitsSnapshot = await propDoc.ref.collection('units').get();
            const units = unitsSnapshot.docs.map(unitDoc => ({ 
                id: unitDoc.id, 
                ...unitDoc.data() 
            }));
            unitsByPropertyId.set(propDoc.id, units);
        }
        
        console.log(`[DEBUG] Building properties array...`);
        const properties = propertiesSnapshot.docs.map((doc) => {
            const propertyData = { id: doc.id, ...doc.data() } as Property;
            propertyData.units = unitsByPropertyId.get(doc.id) || [];
            
            if (propertyData.units.length > 0) {
                const firstUnit = propertyData.units[0];
                propertyData.rent = firstUnit.rent;
                propertyData.bedrooms = parseInt(firstUnit.size) || 0;
                propertyData.bathrooms = 1;
            }
            return propertyData;
        });
        
        console.log(`[DEBUG] Calculating metrics...`);
        const totalProperties = properties.length;
        const totalTenants = tenantCountSnapshot.data().count;
        const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const totalUnits = unitCountSnapshot.data().count;
        const occupancyRate = totalUnits > 0 ? (totalTenants / totalUnits) * 100 : 0;
        
        // Test each helper function individually
        try {
            console.log(`[DEBUG] Testing getAnomalyAlerts...`);
            const alerts = await getAnomalyAlerts(landlordId);
            console.log(`[DEBUG] Alerts result:`, alerts);
        } catch (e) {
            console.error(`[ERROR] getAnomalyAlerts failed:`, e);
        }

        try {
            console.log(`[DEBUG] Testing getLatePaymentData...`);
            const lateData = await getLatePaymentData(landlordId);
            console.log(`[DEBUG] Late payment result:`, lateData);
        } catch (e) {
            console.error(`[ERROR] getLatePaymentData failed:`, e);
        }

        try {
            console.log(`[DEBUG] Testing getPaymentMethodData...`);
            const methodData = await getPaymentMethodData(payments);
            console.log(`[DEBUG] Payment method result:`, methodData);
        } catch (e) {
            console.error(`[ERROR] getPaymentMethodData failed:`, e);
        }
        
        console.log(`[DEBUG] Calling helper functions...`);
        const anomalyAlerts = await getAnomalyAlerts(landlordId);
        const latePaymentData = await getLatePaymentData(landlordId);
        const paymentMethodData = await getPaymentMethodData(payments);
        
        const dashboardData = {
            totalProperties,
            totalTenants,
            totalRevenue,
            revenueChange: 0.12,
            occupancyRate,
            properties,
            anomalyAlerts,
            aiSummary: "AI insights temporarily disabled",
            latePaymentData,
            paymentMethodData
        };
        
        console.log(`[DEBUG] Converting to JSON...`);
        const result = toJSON(dashboardData);
        
        console.log(`[DEBUG] Returning data successfully`);
        return NextResponse.json(result);
        
    } catch (error: any) {
        console.error(`[ERROR] Dashboard API failed at:`, {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: error.code
        });
        
        return NextResponse.json({ 
            error: 'Dashboard API failed', 
            details: error.message 
        }, { status: 500 });
    }
}
