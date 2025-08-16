
import { type NextRequest, NextResponse } from 'next/server';
import { firestore, admin } from '@/lib/firebase-admin';
import path from 'path';
import fs from 'fs';
import { randomBytes } from 'crypto';
import { PropertyFormSchema } from '@/lib/schemas';
import { v4 as uuid } from 'uuid';
import { propertyService } from '@/services/property-service';
import { verifyApiAuth } from '@/lib/server-utils';

export const runtime = 'nodejs'; // Ensure this route runs on the Node.js runtime

const uploadDir = path.join(process.cwd(), 'public/media');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

async function checkAuth(req: NextRequest, allowedRoles: string[] = ['landlord']) {
    const { decodedToken, error } = await verifyApiAuth(req, allowedRoles);
    if (error) {
        return { decodedToken: null, response: error };
    }
    return { decodedToken, response: null };
}

export async function GET(req: NextRequest) {
  try {
    const { decodedToken, response } = await checkAuth(req);
    if (response) return response;
    
    const { uid: userId } = decodedToken!;
    const properties = await propertyService.getPropertiesByLandlord(userId);

    return NextResponse.json(properties);
  } catch (error: any) {
    console.error('[PROPERTIES_GET_ERROR]', error);
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}
