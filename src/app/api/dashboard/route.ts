
import { type NextRequest, NextResponse } from 'next/server';
import { mockDashboardData } from '@/lib/mock-data';

export async function GET(req: NextRequest) {
  try {
    // Return mock data directly as Firebase is removed.
    return NextResponse.json(mockDashboardData);
  } catch (error: any) {
    console.error(`[API_DASHBOARD_ERROR]:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
