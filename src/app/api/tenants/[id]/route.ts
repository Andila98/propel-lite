
/**
 * @fileoverview API route for handling a single tenant.
 *
 * This file defines the API route for fetching or deleting a specific tenant.
 * It uses the TenantService to process the requests.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { tenantService } from '@/services/tenant-service';
import { verifyApiAuth } from '@/lib/server-utils';

export const runtime = 'nodejs';

// GET /api/tenants/[id]
// Fetches a single tenant by their ID.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { decodedToken, error } = await verifyApiAuth(req, ['landlord', 'manager', 'tenant']);
        if (error) return error;

        const { uid, role, landlordId: managerLandlordId } = decodedToken as any;
        const tenantId = params.id;

        const tenant = await tenantService.getTenantById(tenantId);
        if (!tenant) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
        }
        
        // Authorization check: Is the requester the tenant themselves, their landlord, or a manager for that landlord?
        const isSelf = role === 'tenant' && uid === tenantId;
        const isLandlord = role === 'landlord' && uid === tenant.landlordId;
        const isManagerForLandlord = role === 'manager' && managerLandlordId === tenant.landlordId;

        if (!isSelf && !isLandlord && !isManagerForLandlord) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json(tenant, { status: 200 });

    } catch (error: any) {
        console.error(`[API_TENANT_GET_ERROR] Failed to fetch tenant ${params.id}:`, error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE /api/tenants/[id]
// Deletes a single tenant by their ID.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { decodedToken, error } = await verifyApiAuth(req, ['landlord']);
        if (error) return error;

        const { uid: landlordId } = decodedToken;
        await tenantService.deleteTenant(params.id, landlordId);

        return NextResponse.json({ message: 'Tenant successfully deleted.' }, { status: 200 });

    } catch (error: any) {
      console.error(`[API_TENANT_DELETE_ERROR] Failed to delete tenant ${params.id}:`, error);
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Unauthorized or tenant not found' }, { status: 403 });
      }
      return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
