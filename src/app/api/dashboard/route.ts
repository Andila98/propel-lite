
import { NextResponse, type NextRequest } from 'next/server';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { getLandlordAndActor } from '@/lib/auth-utils';
import { authConfig } from '@/config/server-config';
import { generateDashboardInsights } from '@/ai/flows/dashboard-insights';
import { toJSON } from '@/lib/utils';
import type { Property } from '@/lib/types';
import { startOfMonth, endOfMonth } from 'date-fns';

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
        const [propertiesSnapshot, tenantsSnapshot, paymentsSnapshot] = await Promise.all([
            firestore.collection('properties').where('landlordId', '==', landlordId).get(),
            firestore.collection('tenants').where('landlordId', '==', landlordId).get(),
            firestore.collection('payments')
                .where('landlordId', '==', landlordId)
                .where('date', '>=', startOfMonth(new Date()))
                .where('date', '<=', endOfMonth(new Date()))
                .get()
        ]);
        
        const properties = propertiesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Property[];
        
        const totalProperties = propertiesSnapshot.size;
        const totalTenants = tenantsSnapshot.size;
        const totalRevenue = paymentsSnapshot.docs.reduce((sum, doc) => sum + doc.data().amount, 0);

        const totalUnits = properties.reduce((acc, prop) => acc + (prop.units?.length || 0), 0);
        const occupancyRate = totalUnits > 0 ? (totalTenants / totalUnits) * 100 : 0;
        
        let aiSummary = 'AI insights are being generated...';
        let anomalyAlerts: any[] = [];
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
                type: 'vacancy-rate',
                description: anomaly,
                date: 'Just now'
            }));
        } catch (aiError) {
            console.warn('[DASHBOARD_API] AI insight generation failed:', aiError);
            aiSummary = 'Could not generate AI insights at this time.';
        }

        const latePaymentData = [
            { month: 'Jan', latePayments: 2 },
            { month: 'Feb', latePayments: 1 },
            { month: 'Mar', latePayments: 3 },
            { month: 'Apr', latePayments: 2 },
            { month: 'May', latePayments: 4 },
            { month: 'Jun', latePayments: 1 },
        ];
        
        const paymentMethodData = [
            { name: 'M-Pesa', value: 60, fill: 'hsl(var(--chart-1))' },
            { name: 'Bank Transfer', value: 30, fill: 'hsl(var(--chart-2))' },
            { name: 'Stripe', value: 10, fill: 'hsl(var(--chart-3))' },
        ];

        const dashboardData = {
            totalProperties,
            totalTenants,
            totalRevenue,
            revenueChange: 0.12, // mock
            occupancyRate,
            properties: toJSON(properties.slice(0, 5)),
            anomalyAlerts,
            aiSummary,
            latePaymentData,
            paymentMethodData,
        };
        
        return NextResponse.json(dashboardData);
        
    } catch (error: any) {
        console.error('[ERROR: /api/dashboard]', { message: error.message, stack: error.stack });
        return NextResponse.json({ 
            error: 'Internal server error',
            details: error.message 
        }, { status: 500 });
    }
}
