
import { NextResponse, type NextRequest } from 'next/server';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { getLandlordAndActor } from '@/lib/auth-utils';
import { authConfig } from '@/config/server-config';
import { generateDashboardInsights } from '@/ai/flows/dashboard-insights';
import { toJSON } from '@/lib/utils';
import type { Property, Payment, Unit, ActivityItem } from '@/lib/types';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import type { Timestamp } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

// Helper function to get an array of the last N months
const getLastNMonths = (n: number) => {
    const months = [];
    for (let i = n - 1; i >= 0; i--) {
        months.push(format(subMonths(new Date(), i), 'MMM'));
    }
    return months;
};

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
        const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));

        const [propertiesSnapshot, tenantsSnapshot, recentPaymentsSnapshot, allPaymentsSnapshot] = await Promise.all([
            firestore.collection('properties').where('landlordId', '==', landlordId).get(),
            firestore.collection('tenants').where('landlordId', '==', landlordId).get(),
            firestore.collection('payments')
                .where('landlordId', '==', landlordId)
                .where('date', '>=', startOfMonth(new Date()))
                .where('date', '<=', endOfMonth(new Date()))
                .get(),
            firestore.collection('payments')
                .where('landlordId', '==', landlordId)
                .where('date', '>=', sixMonthsAgo)
                .get()
        ]);
        
        const properties: Property[] = propertiesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Property));
        
        // Fetch units for all properties
        const unitsPromises = properties.map(p => 
            firestore.collection('properties').doc(p.id).collection('units').get()
        );
        const unitsSnapshots = await Promise.all(unitsPromises);

        properties.forEach((p, index) => {
            p.units = unitsSnapshots[index].docs.map(unitDoc => ({ id: unitDoc.id, ...unitDoc.data() } as Unit));
        });

        const totalProperties = propertiesSnapshot.size;
        const totalTenants = tenantsSnapshot.size;
        const totalRevenue = recentPaymentsSnapshot.docs.reduce((sum, doc) => sum + doc.data().amount, 0);

        const totalUnits = properties.reduce((acc, prop) => acc + (prop.units?.length || 0), 0);
        const occupiedUnits = properties.reduce((sum, prop) => 
            sum + prop.units.filter(u => u.isOccupied).length, 
        0);
        const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;
        
        // --- Generate dynamic chart data ---

        // Late Payment Trends
        const monthLabels = getLastNMonths(6);
        const latePaymentsByMonth: Record<string, number> = monthLabels.reduce((acc, month) => ({...acc, [month]: 0}), {});
        allPaymentsSnapshot.forEach(doc => {
            const payment = doc.data() as Payment;
            const paymentDate = (payment.date as unknown as Timestamp).toDate(); // Firestore timestamp to Date
            if (paymentDate.getDate() > 5) { // Assuming rent is due by the 5th
                 const month = format(paymentDate, 'MMM');
                 if (latePaymentsByMonth.hasOwnProperty(month)) {
                     latePaymentsByMonth[month]++;
                 }
            }
        });
        const latePaymentData = monthLabels.map(month => ({ month, latePayments: latePaymentsByMonth[month] }));

        // Payment Method Preferences
        const paymentMethodsCount: Record<string, number> = {};
        allPaymentsSnapshot.forEach(doc => {
            const payment = doc.data() as Payment;
            paymentMethodsCount[payment.method] = (paymentMethodsCount[payment.method] || 0) + 1;
        });
        const chartColors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];
        const paymentMethodData = Object.entries(paymentMethodsCount).map(([name, value], index) => ({
            name,
            value,
            fill: chartColors[index % chartColors.length]
        }));
        
        // --- AI Insights ---
        let aiSummary = 'AI insights are being generated...';
        let anomalyAlerts: ActivityItem[] = [];
        try {
            const insights = await generateDashboardInsights({
                totalProperties,
                totalTenants,
                totalRevenue,
                occupancyRate,
            });
            aiSummary = insights.summary;
            anomalyAlerts = insights.anomalies.map((anomaly, index) => ({
                id: `anomaly-${index}`,
                type: 'vacancy-rate', // This could be more dynamic in a real app
                description: anomaly,
                date: 'Just now',
                severity: 'medium'
            }));
        } catch (aiError) {
            console.warn('[DASHBOARD_API] AI insight generation failed:', aiError);
            aiSummary = 'Could not generate AI insights at this time.';
        }

        const dashboardData = {
            totalProperties,
            totalTenants,
            totalRevenue,
            revenueChange: 0.12, 
            occupancyRate,
            properties: toJSON(properties.slice(0, 5)),
            anomalyAlerts,
            aiSummary,
            latePaymentData,
            paymentMethodData,
        };
        
        return NextResponse.json(dashboardData);
        
    } catch (error: unknown) {
        const typedError = error as { message?: string, stack?: string };
        console.error('[ERROR: /api/dashboard]', { message: typedError.message, stack: typedError.stack });
        return NextResponse.json({ 
            error: 'Internal server error',
            details: typedError.message 
        }, { status: 500 });
    }
}
