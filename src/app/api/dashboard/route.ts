
import { NextResponse, type NextRequest } from 'next/server';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import type { Property, Tenant, Payment, DashboardData, ActivityItem, Unit } from '@/lib/types';
import { generateDashboardInsights } from '@/ai/flows/dashboard-insights';
import { sub, format, startOfDay } from 'date-fns';
import { toJSON } from '@/lib/utils';
import { getLandlordAndActor } from '@/lib/auth-utils';
import { authConfig } from '@/config/server-config';

export const runtime = 'nodejs';

async function getAnomalyAlerts(landlordId: string): Promise<ActivityItem[]> {
    // Mock implementation - replace with actual anomaly detection logic
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
    // Mock implementation - replace with actual late payment queries
    const data = [];
    for (let i = 5; i >= 0; i--) {
        const date = sub(new Date(), { months: i });
        data.push({
            month: format(date, 'MMM'),
            latePayments: Math.floor(Math.random() * 5) + 1,
        });
    }
    return data;
}

// Temporarily replace your entire GET function with this:
export async function GET(req: NextRequest) {
    try {
        console.log('Dashboard API hit');
        
        const sessionCookie = req.cookies.get(authConfig.cookieName)?.value;
        if (!sessionCookie) {
            return NextResponse.json({ error: 'No session' }, { status: 401 });
        }
        
        const { landlordId } = await getLandlordAndActor(sessionCookie);
        if (!landlordId) {
            return NextResponse.json({ error: 'No landlord' }, { status: 401 });
        }
        
        // Return minimal test data
        const testData = {
            totalProperties: 0,
            totalTenants: 0,
            totalRevenue: 0,
            revenueChange: 0,
            occupancyRate: 0,
            properties: [],
            anomalyAlerts: [],
            aiSummary: "Test mode",
            latePaymentData: [],
            paymentMethodData: []
        };
        
        console.log('Returning test data');
        return NextResponse.json(testData);
        
    } catch (error: any) {
        console.error('Dashboard error:', error);
        return NextResponse.json({ 
            error: 'Server error', 
            details: error.message 
        }, { status: 500 });
    }
}
