
import { type NextRequest, NextResponse } from 'next/server';
import { propertyService } from '@/services/property-service';
import { verifyApiAuth } from '@/lib/server-utils';

export const runtime = 'nodejs';

// Helper to centralize auth checks for this route
async function checkAuth(req: NextRequest, allowedRoles: string[] = ['landlord']) {
    const { decodedToken, error } = await verifyApiAuth(req, allowedRoles);
    if (error) {
        return { decodedToken: null, response: error };
    }
    return { decodedToken, response: null };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { decodedToken, response } = await checkAuth(req, ['landlord', 'manager']);
    if (response) return response;

    const userId = decodedToken!.uid;
    const propertyId = params.id;

    if (!propertyId) {
        return NextResponse.json({ error: 'Property ID is required' }, { status: 400 });
    }
    
    // The service now handles the authorization check (is this user allowed to see this property?)
    const property = await propertyService.getPropertyById(propertyId, userId);

    if (!property) {
      return NextResponse.json({ error: 'Property not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json(property);
    
  } catch (error: any) {
    console.error(`API Error: Failed to fetch property ${params.id}:`, error);
    return NextResponse.json(
      { error: `Failed to fetch property: ${error.message}` },
      { status: 500 }
    );
  }
}


export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { decodedToken, response } = await checkAuth(req);
    if (response) return response;
    
    const userId = decodedToken!.uid;
    const propertyId = params.id;
    const updates = await req.json();

    // The service handles authorization checks internally
    await propertyService.updateProperty(propertyId, updates, userId);
    
    return NextResponse.json({ message: 'Property updated' });
  } catch (error: any) {
    console.error(`[PROPERTY_UPDATE_ERROR] for ID ${params.id}:`, error);
    if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Unauthorized or not found' }, { status: 403 });
    }
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}


export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { decodedToken, response } = await checkAuth(req);
    if (response) return response;

    const userId = decodedToken!.uid;
    const propertyId = params.id;

    // The service handles authorization checks internally
    await propertyService.deleteProperty(propertyId, userId);

    return NextResponse.json({ message: 'Property deleted successfully' });
  } catch (error: any) {
    console.error(`[PROPERTY_DELETE_ERROR] for ID ${params.id}:`, error);
    if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Unauthorized or not found' }, { status: 403 });
    }
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}
