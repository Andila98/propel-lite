
import { type NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase-admin';
import type { Property, Tenant, Payment, DashboardData } from '@/lib/types';
import { generateDashboardInsights } from '@/ai/flows/dashboard-insights';

async function getAggregatedData() {
    const propertiesSnapshot = await firestore.collection('properties').get();
    const tenantsSnapshot = await firestore.collection('tenants').get();
    const paymentsSnapshot = await firestore.collection('payments').get();

    const properties = propertiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Property[];
    const tenants = tenantsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Tenant[];
    const payments = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Payment[];
    
    // Calculate total revenue for the current month
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const totalRevenue = payments
        .filter(p => {
            const paymentDate = (p.date as any).toDate();
            return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
        })
        .reduce((sum, p) => sum + p.amount, 0);

    // Calculate occupancy rate
    const unitsSnapshot = await firestore.collectionGroup('units').get();
    const totalUnits = unitsSnapshot.size;
    const occupiedUnits = unitsSnapshot.docs.filter(doc => doc.data().isOccupied).length;
    const occupancyRate = totalUnits > 0 ? occupiedUnits / totalUnits : 0;
    
    // In a real app, revenueChange and topPerformer would involve more complex queries,
    // potentially comparing with the previous month's data.
    const revenueChange = 0.15; // Mocking this for now as it requires historical data logic
    const topPerformer = properties.length > 0 ? { address: properties[0].address, revenue: (properties[0].rent || 0) } : null;

    return {
        totalProperties: properties.length,
        totalTenants: tenants.length,
        totalRevenue,
        revenueChange,
        occupancyRate,
        properties: properties.slice(0, 5), // Limit for carousel
        topPerformer
    };
}

export async function GET(req: NextRequest) {
  try {
    const initialData = await getAggregatedData();
    
    const aiSummaryResult = await generateDashboardInsights({
      totalRevenue: initialData.totalRevenue,
      occupancyRate: initialData.occupancyRate,
      totalProperties: initialData.totalProperties,
      totalTenants: initialData.totalTenants,
    });
    
    const dashboardData: DashboardData = {
        ...initialData,
        aiSummary: aiSummaryResult.summary,
        anomalyAlerts: aiSummaryResult.anomalies.map((desc, i) => ({
            id: `anomaly-${i}`,
            type: desc.toLowerCase().includes('vacancy') ? 'vacancy-rate' : 'income-drop',
            description: desc,
            date: 'Just now'
        }))
    }

    return NextResponse.json(dashboardData);
    
  } catch (error: any) {
    console.error(`[API_DASHBOARD_ERROR]:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
