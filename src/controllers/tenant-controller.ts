/**
 * @fileoverview TenantController handles the API logic for tenant-related requests.
 * It acts as an intermediary between the API routes and the TenantService,
 * processing requests and formatting responses.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { TenantService, type TenantData } from '@/services/tenant-service';
import { z } from 'zod';
import { getAuth } from 'firebase-admin/auth';
import { randomBytes } from 'crypto';
import { verifyApiAuth } from '@/lib/server-utils';


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

  private async checkAuth(req: NextRequest, allowedRoles: string[]) {
    const { tokens, error } = await verifyApiAuth(req, allowedRoles);
    if (error) {
        return { tokens: null, response: error };
    }
    return { tokens, response: null };
  }

  /**
   * Handles the creation of a new tenant.
   * @param req - The request object.
   * @returns A NextResponse with the created tenant data or an error.
   */
  async createTenant(req: NextRequest) {
    const { tokens, response } = await this.checkAuth(req, ['landlord']);
    if (response) return response;

    const { uid: landlordId } = tokens!.decodedToken;
    const body = await req.json();

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
      throw error;
    }
  }

  /**
   * Handles listing all tenants for a landlord or manager.
   * @param req - The request object.
   * @returns A NextResponse with the list of tenants or an error.
   */
  async listTenants(req: NextRequest) {
    const { tokens, response } = await this.checkAuth(req, ['landlord', 'manager']);
    if (response) return response;
    
    const { role, uid, claims } = tokens!.decodedToken as any;
    const targetLandlordId = role === 'landlord' ? uid : claims.landlordId;
      
    if (!targetLandlordId) {
      return NextResponse.json({ error: 'Landlord ID not found for this user.' }, { status: 400 });
    }
    
    const tenants = await this.tenantService.getTenantsByLandlord(targetLandlordId as string);
    return NextResponse.json(tenants, { status: 200 });
  }

  /**
   * Handles fetching a single tenant by their ID.
   * @param req - The request object.
   * @param tenantId - The ID of the tenant to fetch.
   * @returns A NextResponse with the tenant data or a not found error.
   */
  async getTenant(req: NextRequest, tenantId: string) {
    const { tokens, response } = await this.checkAuth(req, ['landlord', 'manager']);
    if (response) return response;

    const { role, uid, claims } = tokens!.decodedToken as any;
    const targetLandlordId = role === 'landlord' ? uid : claims.landlordId;

    if (!targetLandlordId) {
        return NextResponse.json({ error: 'Landlord ID not found for this user.' }, { status: 400 });
    }

    const tenant = await this.tenantService.getTenantById(tenantId, targetLandlordId as string);

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json(tenant, { status: 200 });
  }

  /**
   * Handles the deletion of a tenant.
   * @param req - The request object.
   * @param tenantId - The ID of the tenant to delete.
   * @returns A NextResponse with a success message or an error.
   */
  async deleteTenant(req: NextRequest, tenantId: string) {
    const { tokens, response } = await this.checkAuth(req, ['landlord']);
    if (response) return response;

    const { uid: landlordId } = tokens!.decodedToken;
    
    await this.tenantService.deleteTenant(tenantId, landlordId);

    return NextResponse.json({ message: 'Tenant successfully deleted.' }, { status: 200 });
  }
}
