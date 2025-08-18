
import { type NextRequest, NextResponse } from 'next/server';
import { dashboardService } from '@/services/dashboard-service';
import { verifyApiAuth } from '@/lib/server-utils';

export const runtime = 'nodejs';

// This API route provides aggregated data for the main dashboard.
export async function GET(req: NextRequest) {
  try {
    const { decodedToken, error } = await verifyApiAuth(req, ['landlord', 'manager']);
    if (error) return error;

    const { uid: userId } = decodedToken;
    const timeframe = req.nextUrl.searchParams.get('timeframe') || 'month';

    const dashboardData = await dashboardService.getDashboardData(userId, timeframe);
    
    return NextResponse.json(dashboardData);

  } catch (error: any) {
    console.error(`[API_DASHBOARD_ERROR]:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
