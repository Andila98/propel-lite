import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  const lastNMonths = (n: number) => {
    const months = [];
    const d = new Date();
    d.setDate(1);
    for (let i = 0; i < n; i++) {
        const month = d.toLocaleString('default', { month: 'short' });
        months.unshift(month);
        d.setMonth(d.getMonth() - 1);
    }
    return months;
  };
    
  const monthLabels = lastNMonths(6);

  const dashboardData = {
    totalProperties: 12,
    totalTenants: 85,
    totalRevenue: 1250000,
    revenueChange: 0.12, 
    occupancyRate: 92.5,
    properties: [],
    anomalyAlerts: [
        { id: '1', type: 'vacancy-rate', description: 'Anomaly: Vacancy rate for "Greenview Apartments" is at 30%, which is unusually high.', date: 'Just now', severity: 'medium' },
        { id: '2', type: 'income-drop', description: 'Alert: Total income dropped by 15% this month compared to last month.', date: 'Yesterday', severity: 'high' }
    ],
    aiSummary: "Your portfolio is performing well with high occupancy, but the recent income drop at Greenview Apartments needs immediate attention.",
    latePaymentData: monthLabels.map(month => ({ month, latePayments: Math.floor(Math.random() * 5) })),
    paymentMethodData: [
        { name: 'M-Pesa', value: 400, fill: 'hsl(var(--chart-1))' },
        { name: 'Stripe', value: 300, fill: 'hsl(var(--chart-2))'  },
        { name: 'Bank Transfer', value: 300, fill: 'hsl(var(--chart-3))'  },
        { name: 'Cash', value: 200, fill: 'hsl(var(--chart-4))'  }
    ],
  };
        
  return NextResponse.json(dashboardData);
}
