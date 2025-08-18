
import { NextResponse, type NextRequest } from 'next/server';
import { mockPayments } from '@/lib/mock-data';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const { id: tenantId } = params;
    
    try {
      const payments = mockPayments.filter(p => p.tenantId === tenantId);
      return NextResponse.json(payments, { status: 200 });

    } catch (error: any) {
      console.error(`[API_TENANT_PAYMENTS_GET_ERROR] Failed to fetch payments for tenant ${tenantId}:`, error);
      return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
