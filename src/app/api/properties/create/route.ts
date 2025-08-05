
import { type NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/lib/firebase-admin';
import { verifyFirebaseToken } from '@/lib/server-utils';
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

export async function POST(req: NextRequest) {
  try {
    const { userId, role } = await verifyFirebaseToken(req);

    if (role !== 'landlord') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
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

    const totalRent = validatedData.units.reduce((acc: number, unit: Unit) => acc + (unit.rent || 0), 0);
    const totalBedrooms = validatedData.units.reduce((acc: number, unit: Unit) => {
        const type = unit.unitType;
        if (type === 'one-bedroom') return acc + 1;
        if (type === 'two-bedroom') return acc + 2;
        if (type === 'three-bedroom') return acc + 3;
        return acc;
    }, 0);
     const totalBathrooms = validatedData.units.reduce((acc: number, unit: Unit) => {
        const type = unit.unitType;
        if (type === 'one-bedroom' || type === 'two-bedroom' || type === 'three-bedroom') return acc + 1;
        return acc;
    }, 0);
     const totalSquareFootage = validatedData.units.reduce((acc: number, unit: Unit) => acc + (unit.squareFootage || 0), 0);

    const newProperty: Omit<Property, 'id'> = {
      landlordId: userId,
      address: validatedData.address,
      propertyType: validatedData.propertyType,
      imageUrl: publicUrl,
      rent: totalRent,
      bedrooms: totalBedrooms,
      bathrooms: totalBathrooms,
      squareFootage: totalSquareFootage,
      description: validatedData.description,
      units: validatedData.units,
      currency: validatedData.currency,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('properties').add(newProperty);
    
    const createdProperty = {
        id: docRef.id,
        ...newProperty,
        createdAt: new Date().toISOString() // Return a serializable date
    }
    
    return NextResponse.json(createdProperty, { status: 201 });

  } catch (error: any) {
    console.error('[PROPERTY_CREATE_ERROR]', error);
     if (error.message.includes('No auth token provided')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
