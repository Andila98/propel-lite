
import { NextResponse, type NextRequest } from 'next/server';
import { mockTenants } from '@/lib/mock-data';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const tenantId = params.id;
        const tenant = mockTenants.find(t => t.id === tenantId);

        if (!tenant) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
        }
        return NextResponse.json(tenant, { status: 200 });
    } catch (error: any) {
        console.error(`[API_TENANT_GET_ERROR] Failed to fetch tenant ${params.id}:`, error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        console.log(`Mock delete for tenant ${params.id}`);
        return NextResponse.json({ message: 'Tenant successfully deleted (mock).' }, { status: 200 });
    } catch (error: any) {
      console.error(`[API_TENANT_DELETE_ERROR] Failed to delete tenant ${params.id}:`, error);
      return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
