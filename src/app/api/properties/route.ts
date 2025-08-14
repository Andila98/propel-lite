
import { type NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/lib/firebase-admin';
import path from 'path';
import fs from 'fs';
import { randomBytes } from 'crypto';
import { PropertyFormSchema } from '@/lib/schemas';
import { v4 as uuid } from 'uuid';
import { propertyService } from '@/services/property-service';
import { getTokens } from 'next-firebase-auth-edge';
import { authConfig } from '@/config/server-config';

export const runtime = 'nodejs'; // Ensure this route runs on the Node.js runtime

const uploadDir = path.join(process.cwd(), 'public/media');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

async function checkAuth(req: NextRequest, allowedRoles: string[] = ['landlord']) {
    try {
        const tokens = await getTokens(req, authConfig);
        if (!tokens || !allowedRoles.includes(tokens.decodedToken.role)) {
            return null;
        }
        return tokens;
    } catch (e) {
        return null;
    }
}

export async function GET(req: NextRequest) {
  try {
    const tokens = await checkAuth(req);
    if (!tokens) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const { uid: userId } = tokens.decodedToken;
    const properties = await propertyService.getPropertiesByLandlord(userId);

    return NextResponse.json(properties);
  } catch (error: any) {
    console.error('[PROPERTIES_GET_ERROR]', error);
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tokens = await checkAuth(req);
    if (!tokens) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { uid: userId } = tokens.decodedToken;
    
    const formData = await req.formData();
    const file = formData.get('media') as File | null;
    const propertyDataString = formData.get('propertyData') as string | null;

    if (!file || !propertyDataString) {
      return NextResponse.json(
        { error: 'Missing propertyData or media file.' },
        { status: 400 }
      );
    }
    
    let propertyData;
    try {
        propertyData = JSON.parse(propertyDataString);
    } catch (e) {
        return NextResponse.json({ error: 'Invalid propertyData JSON.' }, { status: 400 });
    }

    const validationResult = PropertyFormSchema.safeParse(propertyData);
    if (!validationResult.success) {
        return NextResponse.json(
            { error: 'Invalid property data.', details: validationResult.error.flatten().fieldErrors },
            { status: 400 }
        );
    }

    const validatedData = validationResult.data;
    
    const randomSuffix = randomBytes(8).toString('hex');
    const fileExtension = path.extname(file.name);
    const fileName = `${Date.now()}-${randomSuffix}${fileExtension}`;
    const filePath = path.join(uploadDir, fileName);
    
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, fileBuffer);
    
    const publicUrl = `/media/${fileName}`;

    const createdProperty = await propertyService.createPropertyWithUnits(validatedData, userId, publicUrl);
    
    return NextResponse.json(createdProperty, { status: 201 });

  } catch (error: any) {
    console.error('[PROPERTY_CREATE_ERROR]', error);
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}
