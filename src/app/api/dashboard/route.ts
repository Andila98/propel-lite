
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
    return data;
}

export async function GET(req: NextRequest) {
    const requestId = crypto.randomUUID();
    console.log(`[${requestId}] Dashboard API hit`);

    if (!isFirebaseAdminInitialized) {
        console.error(`[${requestId}] Error: Firebase not initialized.`);
        return NextResponse.json({ error: 'Backend services are not configured.' }, { status: 503 });
    }

    try {
        const { landlordId, error: authError } = await getLandlordAndActor(req);
        if (authError || !landlordId) {
            console.error(`[${requestId}] Auth Error:`, authError);
            return NextResponse.json({ error: authError?.message || 'Unauthorized' }, { status: authError?.statusCode || 401 });
        }
        console.log(`[${requestId}] Authenticated for landlordId: ${landlordId}`);
        
        const timeframe = req.nextUrl.searchParams.get('timeframe') || 'month';
        const now = new Date();
        let startDate: Date;

        switch (timeframe) {
            case 'week':
                startDate = sub(now, { weeks: 1 });
                break;
            case 'quarter':
                startDate = sub(now, { months: 3 });
                break;
            case 'month':
            default:
                startDate = sub(now, { months: 1 });
        }
        
        const previousStartDate = sub(startDate, { days: (now.getTime() - startDate.getTime()) / (1000 * 3600 * 24) });

        console.log(`[${requestId}] Fetching data for period: ${startDate.toISOString()} to ${now.toISOString()}`);

        const [propertiesSnapshot, tenantsSnapshot, paymentsSnapshot, prevPaymentsSnapshot, unitsSnapshot] = await Promise.all([
            firestore.collection('properties').where('landlordId', '==', landlordId).get(),
            firestore.collection('tenants').where('landlordId', '==', landlordId).get(),
            firestore.collection('payments').where('landlordId', '==', landlordId).where('date', '>=', startDate).get(),
            firestore.collection('payments').where('landlordId', '==', landlordId).where('date', '>=', previousStartDate).where('date', '<', startDate).get(),
            firestore.collectionGroup('units').where('landlordId', '==', landlordId).get()
        ]);
        console.log(`[${requestId}] Firestore snapshots fetched.`);

        const properties = propertiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Property[];
        const tenants = tenantsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Tenant[];
        const payments = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Payment[];
        const prevPayments = prevPaymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Payment[];

        const totalRevenue = payments.reduce((acc, p) => acc + p.amount, 0);
        const prevTotalRevenue = prevPayments.reduce((acc, p) => acc + p.amount, 0);
        const revenueChange = prevTotalRevenue > 0 ? (totalRevenue - prevTotalRevenue) / prevTotalRevenue : totalRevenue > 0 ? 1 : 0;
        
        const totalUnits = unitsSnapshot.size;
        const occupiedUnits = unitsSnapshot.docs.filter(doc => doc.data().isOccupied).length;
        const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;
        
        console.log(`[${requestId}] Basic stats calculated.`);

        const [anomalyAlerts, latePaymentData, paymentMethodData, aiSummaryResult] = await Promise.all([
            getAnomalyAlerts(landlordId),
            getLatePaymentData(landlordId),
            getPaymentMethodData(payments),
            generateDashboardInsights({
                totalProperties: properties.length,
                totalTenants: tenants.length,
                totalRevenue: totalRevenue,
                occupancyRate: occupancyRate,
            }).catch(err => {
                console.warn(`[${requestId}] AI Insight generation failed:`, err);
                return { summary: "AI insights are currently unavailable.", anomalies: [] }; // Fallback
            })
        ]);
         console.log(`[${requestId}] Additional data modules fetched.`);

        const responseData: DashboardData = {
            totalProperties: properties.length,
            totalTenants: tenants.length,
            totalRevenue,
            revenueChange,
            occupancyRate,
            properties,
            anomalyAlerts,
            aiSummary: aiSummaryResult.summary,
            latePaymentData,
            paymentMethodData
        };

        console.log(`[${requestId}] Successfully returning dashboard data.`);
        return NextResponse.json(toJSON(responseData));
        
    } catch (error: any) {
        console.error(`[${requestId}] CRITICAL DASHBOARD ERROR:`, { message: error.message, stack: error.stack });
        return NextResponse.json({ 
            error: 'Server error while loading dashboard.', 
            details: error.message 
        }, { status: 500 });
    }
}
