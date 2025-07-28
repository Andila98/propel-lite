
import { type NextRequest, NextResponse } from 'next/server';
import multer from 'multer';
import { db, bucket, admin } from '@/lib/firebase-admin';
import type { Property, Unit } from '@/lib/types';

const MAX_FILE_SIZE_MB = 20;

// Initialize multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024,
  },
});

const isValidFile = (file: File) => {
  const allowedTypes = ["image/", "video/"];
  const isAllowedType = allowedTypes.some(type => file.type.startsWith(type));
  const isWithinSize = file.size <= MAX_FILE_SIZE_MB * 1024 * 1024;
  return isAllowedType && isWithinSize;
};

const getFolder = (mimetype: string) => {
  if (mimetype.startsWith('image/')) return 'images';
  if (mimetype.startsWith('video/')) return 'videos';
  return 'others';
};

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('media') as File | null;
    const propertyDataString = formData.get('propertyData') as string | null;

    if (!file || !propertyDataString) {
      return NextResponse.json(
        { error: 'Missing propertyData or media file.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const propertyData = JSON.parse(propertyDataString);
    
    if (!isValidFile(file)) {
      return NextResponse.json(
        { error: "Invalid file type or size exceeds limit." },
        { status: 400, headers: corsHeaders }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    const folder = getFolder(file.type);
    const fileName = `${folder}/${Date.now()}_${file.name}`;
    const fileRef = bucket.file(fileName);

    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
      },
    });

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    // Now, save property data to Firestore
    const totalRent = propertyData.units.reduce((acc: number, unit: Unit) => acc + unit.rent, 0);
    const totalBedrooms = propertyData.units.reduce((acc: number, unit: Unit) => {
        if (unit.unitType === 'one-bedroom') return acc + 1;
        if (unit.unitType === 'two-bedroom') return acc + 2;
        if (unit.unitType === 'three-bedroom') return acc + 3;
        return acc;
    }, 0);
     const totalBathrooms = propertyData.units.reduce((acc: number, unit: Unit) => {
        if (unit.unitType === 'one-bedroom' || unit.unitType === 'two-bedroom' || unit.unitType === 'three-bedroom') return acc + 1;
        return acc;
    }, 0);
     const totalSquareFootage = propertyData.units.reduce((acc: number, unit: Unit) => acc + unit.squareFootage, 0);

    const newProperty: Omit<Property, 'id'> = {
      address: propertyData.address,
      propertyType: propertyData.propertyType,
      imageUrl: publicUrl,
      rent: totalRent,
      bedrooms: totalBedrooms,
      bathrooms: totalBathrooms,
      squareFootage: totalSquareFootage,
      description: "Default description, please update.", // You might want to pass this from the form
      units: propertyData.units,
      landlordId: propertyData.landlordId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('properties').add(newProperty);

    return NextResponse.json({
      id: docRef.id,
      ...newProperty,
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Upload failed:', error);
    return NextResponse.json(
      { error: `Upload failed: ${error.message}` },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// This is not needed for App Router but good practice to have if you have GET, etc.
export async function GET() {
    try {
        const propertiesSnapshot = await db.collection('properties').orderBy('createdAt', 'desc').get();
        const properties = propertiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json(properties, { headers: corsHeaders });
    } catch (error: any) {
        console.error('Failed to fetch properties:', error);
        return NextResponse.json(
            { error: `Failed to fetch properties: ${error.message}` },
            { status: 500, headers: corsHeaders }
        );
    }
}
