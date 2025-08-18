
import { type NextRequest, NextResponse } from 'next/server';
import { mockDashboardData, mockAuditLogs } from '@/lib/mock-data';
import { generateDashboardInsights } from '@/ai/flows/generate-dashboard-insights';
import { detectAnomalies } from '@/ai/flows/detect-anomalies';
import type { ActivityItem } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const timeframe = req.nextUrl.searchParams.get('timeframe') || 'month';
    const initialData = { ...mockDashboardData };

    // Start both AI flows in parallel for efficiency
    const insightsPromise = generateDashboardInsights({
        totalRevenue: initialData.totalRevenue,
        occupancyRate: initialData.occupancyRate * 100,
        latePayments: 3,
        newMaintenanceRequests: 5,
        timeframe,
    }).catch(e => {
        console.warn(`[DASHBOARD_AI_ERROR] Failed to get insights:`, e.message);
        return null; // Return null on failure
    });
    
    const anomalyPromise = detectAnomalies({
      activities: mockAuditLogs.map(log => ({ id: log.id, description: log.action, timestamp: log.timestamp })),
    }).catch(e => {
        console.warn(`[DASHBOARD_AI_ERROR] Failed to detect anomalies:`, e.message);
        return null; // Return null on failure
    });

    const [insights, anomalyResult] = await Promise.all([insightsPromise, anomalyPromise]);
    
    const responseData = { ...initialData };

    if (insights) {
      responseData.aiInsights = insights;
    }

    if (anomalyResult) {
      // Filter only the activities that the AI flagged as anomalies
      const flaggedAnomalies = anomalyResult.anomalies.filter(a => a.isAnomaly);
      responseData.anomalyAlerts = flaggedAnomalies.map(anomaly => {
        const originalLog = mockAuditLogs.find(log => log.id === anomaly.id);
        return {
          id: anomaly.id,
          type: 'vacancy-rate', // Using a default icon type for now
          description: anomaly.reason || originalLog?.action || 'Unusual activity detected.',
          date: new Date(originalLog?.timestamp as string).toLocaleDateString(),
        };
      });
    }

    return NextResponse.json(responseData);
    
  } catch (error: any) {
    console.error(`[API_DASHBOARD_ERROR]:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
