/**
 * @fileoverview API route for handling tenant collections.
 *
 * This file defines the API routes for creating a new tenant and listing all tenants
 * for a landlord. It uses the TenantController to abstract away the business logic,
 * keeping the route handlers clean and focused on request/response.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { TenantController } from '@/controllers/tenant-controller';
import { withRole, type AuthenticatedRequest } from '@/lib/middleware/withRole';

const controller = new TenantController();

// GET /api/tenants
// Lists all tenants for the authenticated landlord or manager.
export const GET = withRole(
  async (req: AuthenticatedRequest) => {
    try {
      return await controller.listTenants(req);
    } catch (error: any) {
      console.error('[API_TENANTS_GET_ERROR] Failed to list tenants:', error);
      return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
  },
  ['landlord', 'manager'] // Both roles can view tenants
);

// POST /api/tenants
// Creates a new tenant.
export const POST = withRole(
  async (req: AuthenticatedRequest) => {
    try {
      return await controller.createTenant(req);
    } catch (error: any) {
      console.error('[API_TENANT_CREATE_ERROR] Failed to create tenant:', error);
      return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
  },
  ['landlord'] // Only landlords can create new tenants
);
