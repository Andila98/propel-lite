
import { type NextRequest, NextResponse } from 'next/server';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import type { Property, Tenant, Payment, DashboardData } from '@/lib/types';
import { generateDashboardInsights } from '@/ai/flows/dashboard-insights';
import { subMonths, format, parseISO } from 'date-fns';
import { toISOString } from '@/lib/utils';

async function getAggregatedData() {
    const propertiesSnapshot = await firestore.collection('properties').get();
    const tenantsSnapshot = await firestore.collection('tenants').get();
    const paymentsSnapshot = await firestore.collection('payments').get();

    const properties = propertiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Property[];
    const tenants = tenantsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Tenant[];
    const payments = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), date: toISOString(doc.data().date) })) as Payment[];
    
    // Calculate total revenue for the current month
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const totalRevenue = payments
        .filter(p => {
            const paymentDate = new Date(p.date as string);
            return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
        })
        .reduce((sum, p) => sum + p.amount, 0);

    // Calculate occupancy rate
    const unitsSnapshot = await firestore.collectionGroup('units').get();
    const totalUnits = unitsSnapshot.size;
    const occupiedUnits = unitsSnapshot.docs.filter(doc => doc.data().isOccupied).length;
    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;
    
    const revenueChange = 0.15; // Mocking this for now as it requires historical data logic
    
    // Calculate late payment and payment method analytics
      const now = new Date();
      const latePayments: Record<string, number> = {};
      const paymentMethods: Record<string, number> = { 'M-Pesa': 0, 'Stripe': 0, 'Card': 0, 'Other': 0 };

      for (let i = 5; i >= 0; i--) {
        const month = subMonths(now, i);
        const monthKey = format(month, 'MMM');
        latePayments[monthKey] = 0;
      }

      payments.forEach(payment => {
          if (payment.type === 'Rent') {
              const paymentDate = parseISO(payment.date as string);
              if (paymentDate.getDate() > 5) { // Assuming rent due on 1st, late after 5th
                  const monthKey = format(paymentDate, 'MMM');
                  if (monthKey in latePayments) {
                      latePayments[monthKey]++;
                  }
              }
          }

          const method = payment.method;
          if (method.toLowerCase().includes('mpesa')) {
              paymentMethods['M-Pesa']++;
          } else if (method.toLowerCase().includes('stripe') || method.toLowerCase().includes('card')) {
              paymentMethods['Stripe']++;
          } else {
              paymentMethods['Other']++;
          }
      });
      
      const latePaymentData = Object.entries(latePayments).map(([month, count]) => ({ month, latePayments: count }));
      const paymentMethodData = Object.entries(paymentMethods)
        .filter(([,value]) => value > 0)
        .map(([name, value]) => ({ name, value, fill: `var(--color-${name.toLowerCase().replace('-','')})`}));


    return {
        totalProperties: properties.length,
        totalTenants: tenants.length,
        totalRevenue,
        revenueChange,
        occupancyRate: occupancyRate,
        properties: properties.slice(0, 5), // Limit for carousel
        latePaymentData,
        paymentMethodData
    };
}

export async function GET(req: NextRequest) {
  if (!isFirebaseAdminInitialized) {
    console.error('[API_DASHBOARD] Firebase Admin is not initialized.');
    return NextResponse.json({ error: 'Firebase is not initialized. Please check server credentials.' }, { status: 500 });
  }

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
    console.error('[API_DASHBOARD_ERROR]:', error);
    return NextResponse.json({ error: `An unexpected error occurred: ${error.message}` }, { status: 500 });
  }
}
