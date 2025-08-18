
import { type NextRequest, NextResponse } from 'next/server';
import { mockDashboardData } from '@/lib/mock-data';
import { generateDashboardInsights } from '@/ai/flows/generate-dashboard-insights';

export async function GET(req: NextRequest) {
  try {
    const timeframe = req.nextUrl.searchParams.get('timeframe') || 'month';
    const initialData = { ...mockDashboardData };

    try {
        const insights = await generateDashboardInsights({
            totalRevenue: initialData.totalRevenue,
            occupancyRate: initialData.occupancyRate * 100, // Convert to percentage
            latePayments: 3, // Mock data,
            newMaintenanceRequests: 5, // Mock data
            timeframe,
        });
        
        const responseData = {
            ...initialData,
            aiInsights: insights,
        };
        
        return NextResponse.json(responseData);

    } catch (aiError: any) {
        console.warn(`[DASHBOARD_AI_ERROR] Failed to get AI insights, serving baseline data:`, aiError.message);
        // If AI fails, return the baseline data without insights
        return NextResponse.json(initialData);
    }
    
  } catch (error: any) {
    console.error(`[API_DASHBOARD_ERROR]:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
