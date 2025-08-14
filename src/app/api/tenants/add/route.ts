import { type NextRequest, NextResponse } from 'next/server';
import { TenantService } from '@/services/tenant-service';
import { z } from 'zod';
import { getTokens } from 'next-firebase-auth-edge';
import { authConfig } from '@/config/server-config';


const CreateTenantSchema = z.object({
  name: z.string().min(2, "Please enter a valid name."),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().optional(),
  propertyId: z.string({ required_error: "Please select a property."}),
  unitId: z.string({ required_error: "Please select a unit." }),
  leaseStart: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid start date" }),
  leaseEnd: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid end date" }),
});

const tenantService = new TenantService();

export async function POST(req: NextRequest) {
    try {
        const tokens = await getTokens(req, authConfig);
        if (!tokens || tokens.decodedToken.role !== 'landlord') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { uid: landlordId } = tokens.decodedToken;
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
        console.error('[API_TENANT_CREATE_ERROR]', error);
         if (error.code === 'auth/email-already-exists') {
            return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });
        }
        if (error.message.includes("already occupied")) {
            return NextResponse.json({ error: error.message }, { status: 409 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
