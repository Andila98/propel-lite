

import { type NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/lib/firebase-admin';
import { withRole, type AuthenticatedRequest } from '@/lib/middleware/withRole';
import path from 'path';
import fs from 'fs';
import { randomBytes } from 'crypto';
import type { Property } from '@/lib/types';
import { PropertyFormSchema } from '@/lib/schemas';
import { v4 as uuid } from 'uuid';
import { propertyService } from '@/services/property-service';

// Define the upload directory for property images
const uploadDir = path.join(process.cwd(), 'public/media');

// Ensure the upload directory exists, creating it if necessary.
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * GET /api/properties
 * Fetches all properties belonging to the authenticated landlord.
 * This route is protected and requires a 'landlord' role.
 */
export const GET = withRole(async (req: AuthenticatedRequest) => {
  try {
    const { uid: userId } = req.user;
    console.log(`API: Fetching properties for landlordId: ${userId}`);

    // Use the PropertyService to fetch properties
    const properties = await propertyService.getPropertiesByLandlord(userId);

    return NextResponse.json(properties);
  } catch (error: any) {
    console.error('[PROPERTIES_GET_ERROR]', error);
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}, ['landlord']);


/**
 * POST /api/properties
 * Creates a new property with an uploaded image.
 * This route is protected and requires a 'landlord' role.
 * It expects a `multipart/form-data` payload.
 */
export const POST = withRole(async (req: AuthenticatedRequest) => {
  try {
    // The user's ID is extracted from the verified token by the withRole middleware
    const { uid: userId } = req.user;
    console.log(`API: Property creation attempt by landlordId: ${userId}`);
    
    // Parse the incoming multipart form data
    const formData = await req.formData();
    const file = formData.get('media') as File | null;
    const propertyDataString = formData.get('propertyData') as string | null;

    if (!file || !propertyDataString) {
      console.error("API Error: Missing propertyData or media file.");
      return NextResponse.json(
        { error: 'Missing propertyData or media file.' },
        { status: 400 }
      );
    }
    
    // Parse the JSON string of property data
    let propertyData;
    try {
        propertyData = JSON.parse(propertyDataString);
    } catch (e) {
        console.error("API Error: Invalid propertyData JSON.");
        return NextResponse.json({ error: 'Invalid propertyData JSON.' }, { status: 400 });
    }

    // Validate the parsed data against our schema
    const validationResult = PropertyFormSchema.safeParse(propertyData);
    if (!validationResult.success) {
        console.error("API Validation Errors:", validationResult.error.flatten().fieldErrors);
        return NextResponse.json(
            { error: 'Invalid property data.', details: validationResult.error.flatten().fieldErrors },
            { status: 400 }
        );
    }

    const validatedData = validationResult.data;
    
    // --- File Handling ---
    // Generate a unique filename to prevent conflicts
    const randomSuffix = randomBytes(8).toString('hex');
    const fileExtension = path.extname(file.name);
    const fileName = `${Date.now()}-${randomSuffix}${fileExtension}`;
    const filePath = path.join(uploadDir, fileName);
    
    // Write the file to the local filesystem
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, fileBuffer);
    
    // The public URL path for the saved image
    const publicUrl = `/media/${fileName}`;
    console.log(`API: Image uploaded successfully to ${publicUrl}`);

    // --- Database Transaction ---
    // Use the PropertyService to create the property and its units
    const createdProperty = await propertyService.createPropertyWithUnits(validatedData, userId, publicUrl);
    
    // --- Success Response ---
    return NextResponse.json(createdProperty, { status: 201 });

  } catch (error: any) {
    console.error('[PROPERTY_CREATE_ERROR]', error);
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}, ['landlord']);
