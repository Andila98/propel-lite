
/**
 * @fileoverview API route for handling tenant collections.
 *
 * This file defines the API routes for creating a new tenant and listing all tenants
 * for a landlord. It uses the TenantService to abstract away the business logic,
 * keeping the route handlers clean and focused on request/response.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { tenantService, type TenantData } from '@/services/tenant-service';
import { verifyApiAuth } from '@/lib/server-utils';
import { z } from 'zod';

export const runtime = 'nodejs';

// Schema for validating new tenant data from the request body.
const CreateTenantSchema = z.object({
  name: z.string().min(2, "Please enter a valid name."),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().optional(),
  propertyId: z.string({ required_error: "Please select a property."}),
  unitId: z.string({ required_error: "Please select a unit." }),
  leaseStart: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid start date" }),
  leaseEnd: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid end date" }),
});

// GET /api/tenants
// Lists all tenants for the authenticated landlord or manager.
export async function GET(req: NextRequest) {
    try {
        const { decodedToken, error } = await verifyApiAuth(req, ['landlord', 'manager']);
        if (error) return error;
        
        const { role, uid, claims } = decodedToken as any;
        const targetLandlordId = role === 'landlord' ? uid : claims.landlordId;
        
        if (!targetLandlordId) {
            return NextResponse.json({ error: 'Landlord ID not found for this user.' }, { status: 400 });
        }
        
        const tenants = await tenantService.getTenantsByLandlord(targetLandlordId);
        return NextResponse.json(tenants, { status: 200 });

    } catch (error: any) {
      console.error('[API_TENANTS_GET_ERROR] Failed to list tenants:', error);
      return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

// POST /api/tenants
// Creates a new tenant.
export async function POST(req: NextRequest) {
    try {
        const { decodedToken, error } = await verifyApiAuth(req, ['landlord']);
        if (error) return error;

        const { uid: landlordId } = decodedToken;
        const body = await req.json();

        const validationResult = CreateTenantSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Invalid tenant data.', details: validationResult.error.flatten().fieldErrors },
                { status: 400 }
            );
        }
        
        const createdTenant = await tenantService.createTenant(validationResult.data, landlordId);

        return NextResponse.json(createdTenant, { status: 201 });

    } catch (error: any) {
      console.error('[API_TENANT_CREATE_ERROR] Failed to create tenant:', error);
      if (error.code === 'auth/email-already-exists') {
        return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });
      }
       if (error.message.includes("already occupied")) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
