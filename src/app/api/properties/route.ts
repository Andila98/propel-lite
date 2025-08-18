
import { type NextRequest, NextResponse } from 'next/server';
import { propertyService } from '@/services/property-service';
import { verifyApiAuth } from '@/lib/server-utils';
import { isFirebaseAdminInitialized } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

async function checkAuth(req: NextRequest, allowedRoles: string[] = ['landlord', 'manager']) {
    const { decodedToken, error } = await verifyApiAuth(req, allowedRoles);
    if (error) {
        return { decodedToken: null, response: error };
    }
    return { decodedToken, response: null };
}

export async function GET(req: NextRequest) {
  if (!isFirebaseAdminInitialized) {
    return NextResponse.json({ error: 'Firebase not configured.' }, { status: 500 });
  }
  try {
    const { decodedToken, response } = await checkAuth(req);
    if (response) return response;
    
    const { uid: userId, role } = decodedToken!;
    
    let properties;
    if (role === 'landlord') {
        properties = await propertyService.getPropertiesByLandlord(userId);
    } else if (role === 'manager') {
        // The service now handles getting properties for a specific manager
        properties = await propertyService.getPropertiesForManager(userId);
    } else {
        return NextResponse.json({ error: 'Unauthorized role' }, { status: 403 });
    }

    return NextResponse.json(properties);
  } catch (error: any) {
    console.error('[PROPERTIES_GET_ERROR]', error);
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}
