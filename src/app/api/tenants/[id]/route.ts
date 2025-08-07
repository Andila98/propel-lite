/**
 * @fileoverview API route for handling a single tenant.
 *
 * This file defines the API route for fetching or deleting a specific tenant.
 * It uses the TenantController to process the requests, which in turn uses the TenantService
 * for database operations. This follows a clean controller/service pattern.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { TenantController } from '@/controllers/tenant-controller';
import { withRole, type AuthenticatedRequest } from '@/lib/middleware/withRole';

const controller = new TenantController();

// GET /api/tenants/[id]
// Fetches a single tenant by their ID.
export const GET = withRole(
  async (req: AuthenticatedRequest, { params }: { params: { id: string } }) => {
    try {
      return await controller.getTenant(req, params.id);
    } catch (error: any) {
      console.error(`[API_TENANT_GET_ERROR] Failed to fetch tenant ${params.id}:`, error);
      return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
  },
  ['landlord', 'manager'] // Roles that can fetch a tenant
);

// DELETE /api/tenants/[id]
// Deletes a single tenant by their ID.
export const DELETE = withRole(
  async (req: AuthenticatedRequest, { params }: { params: { id: string } }) => {
    try {
      return await controller.deleteTenant(req, params.id);
    } catch (error: any) {
      console.error(`[API_TENANT_DELETE_ERROR] Failed to delete tenant ${params.id}:`, error);
      return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
  },
  ['landlord'] // Only landlords can delete tenants
);
