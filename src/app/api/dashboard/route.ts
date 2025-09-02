
import { NextResponse, type NextRequest } from 'next/server';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import type { Property, Tenant, Payment, DashboardData, ActivityItem, Unit } from '@/lib/types';
import { generateDashboardInsights } from '@/ai/flows/dashboard-insights';
import { sub, format, startOfDay } from 'date-fns';
import { toJSON } from '@/lib/utils';
import { getLandlordAndActor } from '@/lib/auth-utils';

export const runtime = 'nodejs';

async function getAnomalyAlerts(landlordId: string): Promise<ActivityItem[]> {
    // This is a mock implementation. In a real app, this would involve
    // more complex logic to detect anomalies from your data.
    return [
        {
            id: 'alert1',
            type: 'vacancy-rate',
            description: 'Vacancy rate is slightly high at 15%. Consider marketing vacant units.',
            date: '2 days ago',
        },
        {
            id: 'alert2',
            type: 'income-drop',
            description: 'Monthly revenue dropped by 8% compared to the previous month.',
            date: '1 day ago',
        }
    ];
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
  // This is a mock implementation. In a real app, you would query your payments collection.
  const data = [];
  for (let i = 5; i >= 0; i--) {
    const date = sub(new Date(), { months: i });
    data.push({
      month: format(date, 'MMM'),
      latePayments: Math.floor(Math.random() * 5) + 1, // Random data for demo
    });
  }
  return data;
}

export async function GET(req: NextRequest) {
    if (!isFirebaseAdminInitialized) {
        return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 503 });
    }

    const { landlordId, error: authError } = await getLandlordAndActor(req);
    if (authError || !landlordId) {
        return NextResponse.json({ error: authError?.message || 'Unauthorized' }, { status: authError?.statusCode || 401 });
    }

    try {
        const thirtyDaysAgo = startOfDay(sub(new Date(), { days: 30 }));
        
        const [
            propertiesSnapshot,
            tenantCountSnapshot,
            paymentsSnapshot,
            unitCountSnapshot,
        ] = await Promise.all([
            firestore.collection('properties').where('landlordId', '==', landlordId).limit(10).get(),
            firestore.collection('tenants').where('landlordId', '==', landlordId).count().get(),
            firestore.collection('payments').where('landlordId', '==', landlordId).where('date', '>=', thirtyDaysAgo).get(),
            firestore.collectionGroup('units').where('landlordId', '==', landlordId).count().get(),
        ]);
        
        const payments: Payment[] = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));

        const unitsByPropertyId = new Map<string, Unit[]>();
        // Only fetch units for the limited properties to display on the dashboard
        for (const propDoc of propertiesSnapshot.docs) {
            const unitsSnapshot = await propDoc.ref.collection('units').get();
            const units = unitsSnapshot.docs.map(unitDoc => ({ id: unitDoc.id, ...unitDoc.data() } as Unit));
            unitsByPropertyId.set(propDoc.id, units);
        }

        const properties: Property[] = propertiesSnapshot.docs.map((doc) => {
            const propertyData = { id: doc.id, ...doc.data() } as Property;
            propertyData.units = unitsByPropertyId.get(doc.id) || [];
            
            if (propertyData.units.length > 0) {
                 const firstUnit = propertyData.units[0];
                 propertyData.rent = firstUnit.rent;
                 propertyData.bedrooms = parseInt(firstUnit.size) || 0;
                 propertyData.bathrooms = 1; // Assuming 1 bathroom for simplicity
            }
            return propertyData;
        });
        
        const totalProperties = properties.length;
        const totalTenants = tenantCountSnapshot.data().count;
        const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

        const totalUnits = unitCountSnapshot.data().count;
        const occupancyRate = totalUnits > 0 ? (totalTenants / totalUnits) * 100 : 0;
        
        let aiSummary: string | undefined;
        try {
            const insights = await generateDashboardInsights({ totalRevenue, occupancyRate, totalProperties, totalTenants });
            aiSummary = insights.summary;
        } catch (aiError) {
            console.warn("[WARN: /api/dashboard] Could not generate AI summary:", aiError);
            aiSummary = "AI insights are currently unavailable.";
        }
        
        const anomalyAlerts = await getAnomalyAlerts(landlordId);
        const latePaymentData = await getLatePaymentData(landlordId);
        const paymentMethodData = await getPaymentMethodData(payments);

        const dashboardData: DashboardData = {
            totalProperties,
            totalTenants,
            totalRevenue,
            revenueChange: 0.12, // mock data
            occupancyRate,
            properties,
            anomalyAlerts,
            aiSummary,
            latePaymentData,
            paymentMethodData
        };

        return NextResponse.json(toJSON(dashboardData));

    } catch (error: any) {
        console.error('[ERROR: /api/dashboard]', error);
        return NextResponse.json({ error: 'An internal server error occurred while fetching dashboard data.' }, { status: 500 });
    }
}
