/**
 * @fileoverview TenantController handles the API logic for tenant-related requests.
 * It acts as an intermediary between the API routes and the TenantService,
 * processing requests and formatting responses.
 */

import { NextResponse } from 'next/server';
import { type AuthenticatedRequest } from '@/lib/middleware/withRole';
import { TenantService } from '@/services/tenant-service';
import type { TenantData } from '@/services/tenant-service';
import { z } from 'zod';
import { getAuth } from 'firebase-admin/auth';
import { randomBytes } from 'crypto';

// Schema for validating new tenant data from the request body.
const CreateTenantSchema = z.object({
  name: z.string().min(2, "Please enter a valid name."),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().optional(),
  propertyId: z.string({ required_error: "Please select a property." }),
  unitId: z.string({ required_error: "Please select a unit." }),
  leaseStart: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid start date" }),
  leaseEnd: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid end date" }),
});


export class TenantController {
  private tenantService = new TenantService();

  /**
   * Handles the creation of a new tenant.
   * @param req - The authenticated request object.
   * @returns A NextResponse with the created tenant data or an error.
   */
  async createTenant(req: AuthenticatedRequest) {
    const { uid: landlordId } = req.user;
    const body = await req.json();

    // Validate the request body.
    const validationResult = CreateTenantSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid tenant data.', details: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    try {
      const createdTenant = await this.tenantService.createTenant(validationResult.data, landlordId);
      return NextResponse.json(createdTenant, { status: 201 });
    } catch (error: any) {
      if (error.code === 'auth/email-already-exists') {
        return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });
      }
      if (error.message.includes("already occupied")) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      // Re-throw other errors to be caught by the route handler's catch block.
      throw error;
    }
  }

  /**
   * Handles listing all tenants for a landlord.
   * @param req - The authenticated request object.
   * @returns A NextResponse with the list of tenants or an error.
   */
  async listTenants(req: AuthenticatedRequest) {
    const { role, uid, landlordId } = req.user;
    const targetLandlordId = role === 'landlord' ? uid : landlordId;
      
    if (!targetLandlordId) {
      return NextResponse.json({ error: 'Landlord ID not found for this user.' }, { status: 400 });
    }
    
    const tenants = await this.tenantService.getTenantsByLandlord(targetLandlordId);
    return NextResponse.json(tenants, { status: 200 });
  }

  /**
   * Handles fetching a single tenant by their ID.
   * @param req - The authenticated request object.
   * @param tenantId - The ID of the tenant to fetch.
   * @returns A NextResponse with the tenant data or a not found error.
   */
  async getTenant(req: AuthenticatedRequest, tenantId: string) {
    const { role, uid, landlordId } = req.user;
    const targetLandlordId = role === 'landlord' ? uid : landlordId;

    if (!targetLandlordId) {
        return NextResponse.json({ error: 'Landlord ID not found for this user.' }, { status: 400 });
    }

    const tenant = await this.tenantService.getTenantById(tenantId, targetLandlordId);

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json(tenant, { status: 200 });
  }

  /**
   * Handles the deletion of a tenant.
   * @param req - The authenticated request object.
   * @param tenantId - The ID of the tenant to delete.
   * @returns A NextResponse with a success message or an error.
   */
  async deleteTenant(req: AuthenticatedRequest, tenantId: string) {
    const { uid: landlordId } = req.user; // Only landlords can delete.
    
    await this.tenantService.deleteTenant(tenantId, landlordId);

    return NextResponse.json({ message: 'Tenant successfully deleted.' }, { status: 200 });
  }
}
