
import { type NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/lib/firebase-admin';
import { withRole, type AuthenticatedRequest } from '@/lib/middleware/withRole';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomBytes } from 'crypto';
import type { Property, Unit } from '@/lib/types';
import { PropertyFormSchema } from '@/lib/schemas';


const uploadDir = path.join(process.cwd(), 'public/media');

// Ensure the upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export const POST = withRole(async (req: AuthenticatedRequest) => {
  try {
    const { uid: userId } = req.user;
    
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
    } catch(e) {
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
    
    // Save the file locally
    const randomSuffix = randomBytes(8).toString('hex');
    const fileExtension = path.extname(file.name);
    const fileName = `${Date.now()}-${randomSuffix}${fileExtension}`;
    const filePath = path.join(uploadDir, fileName);
    
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, fileBuffer);
    
    const publicUrl = `/media/${fileName}`;

    const newProperty: Omit<Property, 'id' | 'createdAt'> = {
      landlordId: userId,
      name: validatedData.name,
      address: validatedData.address,
      type: validatedData.type,
      imageUrl: publicUrl,
      description: validatedData.description,
    };

    const docRef = await db.collection('properties').add({
        ...newProperty,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    const createdProperty = {
        id: docRef.id,
        ...newProperty,
        createdAt: new Date().toISOString() // Return a serializable date
    }
    
    return NextResponse.json(createdProperty, { status: 201 });

  } catch (error: any) {
    console.error('[PROPERTY_CREATE_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, ['landlord']);
