
import { NextResponse, type NextRequest } from 'next/server';
import { mockTenants } from '@/lib/mock-data';
import { v4 as uuid } from 'uuid';

export async function GET(req: NextRequest) {
    try {
        return NextResponse.json(mockTenants, { status: 200 });
    } catch (error: any) {
      console.error('[API_TENANTS_GET_ERROR] Failed to list tenants:', error);
      return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const newTenantId = uuid();
        const newTenant = {
            id: newTenantId,
            uid: newTenantId,
            ...body,
            rentStatus: 'Paid',
            paymentHistory: [],
            avatarUrl: 'https://placehold.co/100x100.png',
        };
        console.log('Mock creating tenant:', newTenant);
        return NextResponse.json(newTenant, { status: 201 });

    } catch (error: any) {
      console.error('[API_TENANT_CREATE_ERROR] Failed to create tenant:', error);
      return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
