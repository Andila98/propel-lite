
import { type NextRequest, NextResponse } from 'next/server';
import { mockDashboardData, mockAuditLogs } from '@/lib/mock-data';

export async function GET(req: NextRequest) {
  try {
    const initialData = { ...mockDashboardData };
    
    // In this mock version, we'll just attach the mock anomaly alerts directly.
    initialData.anomalyAlerts = [
        { id: '1', type: 'income-drop', description: 'AI Alert: Total income for Greenwood Heights dropped by 15% this month compared to last month.', date: '2 days ago' },
        { id: '2', type: 'vacancy-rate', description: 'AI Alert: Vacancy rate has increased to 25%. Consider running a promotion for new tenants.', date: '5 days ago' }
    ];

    return NextResponse.json(initialData);
    
  } catch (error: any) {
    console.error(`[API_DASHBOARD_ERROR]:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
