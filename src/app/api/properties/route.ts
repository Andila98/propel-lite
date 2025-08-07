
import { type NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/lib/firebase-admin';
import { withRole, type AuthenticatedRequest } from '@/lib/middleware/withRole';
import path from 'path';
import fs from 'fs';
import { randomBytes } from 'crypto';
import type { Property } from '@/lib/types';
import { PropertyFormSchema } from '@/lib/schemas';
import { v4 as uuid } from 'uuid';

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

    // Query Firestore for properties where landlordId matches the authenticated user's ID
    const snapshot = await db
      .collection('properties')
      .where('landlordId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    // If no properties are found, return an empty array.
    if (snapshot.empty) {
        return NextResponse.json([]);
    }

    // Map the documents to an array of property objects
    const properties = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    }));

    return NextResponse.json(properties);
  } catch (error: any) {
    console.error('[PROPERTIES_GET_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
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
    
    // Parse the incoming multipart form data
    const formData = await req.formData();
    const file = formData.get('media') as File | null;
    const propertyDataString = formData.get('propertyData') as string | null;

    if (!file || !propertyDataString) {
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
        return NextResponse.json({ error: 'Invalid propertyData JSON.' }, { status: 400 });
    }

    // Validate the parsed data against our schema
    const validationResult = PropertyFormSchema.safeParse(propertyData);
    if (!validationResult.success) {
        console.error("Validation Errors:", validationResult.error.flatten().fieldErrors);
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

    // --- Firestore Data Preparation ---
    const newProperty: Omit<Property, 'id' | 'createdAt'> = {
      landlordId: userId, // Use the authenticated user's ID
      name: validatedData.name,
      address: validatedData.address,
      type: validatedData.type,
      imageUrl: publicUrl,
      description: validatedData.description,
      currency: validatedData.currency,
    };

    // --- Database Transaction ---
    const docRef = db.collection('properties').doc();
    await docRef.set({
        ...newProperty,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // If units are provided, create them in the subcollection as a batch operation
    if (validatedData.units && validatedData.units.length > 0) {
      const unitsBatch = db.batch();
      validatedData.units.forEach(unit => {
        const unitId = uuid();
        const unitRef = docRef.collection('units').doc(unitId);
        unitsBatch.set(unitRef, {
          ...unit,
          id: unitId,
          propertyId: docRef.id,
          landlordId: userId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
      await unitsBatch.commit();
    }
    
    // --- Success Response ---
    const createdProperty = {
        id: docRef.id,
        ...newProperty,
        createdAt: new Date().toISOString() // Return a serializable date for the client
    }
    
    return NextResponse.json(createdProperty, { status: 201 });

  } catch (error: any) {
    console.error('[PROPERTY_CREATE_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, ['landlord']);
