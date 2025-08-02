
import { type NextRequest, NextResponse } from 'next/server';
import multer from 'multer';
import { db, admin } from '@/lib/firebase-admin';
import type { Property, Unit } from '@/lib/types';
import path from 'path';
import fs from 'fs';
import { PropertyFormSchema } from '@/lib/schemas';

const uploadDir = path.join(process.cwd(), 'public/media');

// Ensure the upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for local file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const fileExtension = path.extname(file.originalname);
    const fileName = `${Date.now()}${fileExtension}`;
    cb(null, fileName);
  },
});

const upload = multer({ storage });

const runMiddleware = (req: any, res: any, fn: any) => {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
};

export async function OPTIONS(req: NextRequest) {
    const res = new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
    return res;
}


export async function POST(req: NextRequest) {
  const res = new NextResponse();

  try {
    const tempReq: any = req;
    const tempRes: any = res;

    await runMiddleware(tempReq, tempRes, upload.single('media'));

    const file = tempReq.file;
    const propertyDataString = tempReq.body.propertyData;

    if (!file || !propertyDataString) {
      console.error("API Error: Missing propertyData or media file.");
      return NextResponse.json(
        { error: 'Missing propertyData or media file.' },
        { status: 400 }
      );
    }
    
    let propertyData;
    try {
        propertyData = JSON.parse(propertyDataString);
    } catch(e) {
        console.error("API Error: Invalid propertyData JSON.", e);
        return NextResponse.json({ error: 'Invalid propertyData JSON.' }, { status: 400 });
    }

    // Server-side validation
    const validationResult = PropertyFormSchema.safeParse(propertyData);
    if (!validationResult.success) {
        console.error("API Error: Server-side validation failed:", validationResult.error.flatten().fieldErrors);
        return NextResponse.json(
            { error: 'Invalid property data.', details: validationResult.error.flatten().fieldErrors },
            { status: 400 }
        );
    }

    const validatedData = validationResult.data;
    
    const publicUrl = `/media/${file.filename}`;

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
      address: validatedData.address,
      propertyType: validatedData.propertyType,
      imageUrl: publicUrl,
      rent: totalRent,
      bedrooms: totalBedrooms,
      bathrooms: totalBathrooms,
      squareFootage: totalSquareFootage,
      description: validatedData.description,
      units: validatedData.units,
      landlordId: "user_12345", // Mock landlordId
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('properties').add(newProperty);
    console.log("API Info: Successfully created property with ID:", docRef.id);

    return NextResponse.json({
      id: docRef.id,
      ...newProperty,
      imageUrl: publicUrl,
    });

  } catch (error: any) {
    console.error('API Error: Upload failed:', error);
    return NextResponse.json(
      { error: `Upload failed: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function GET() {
    try {
        const propertiesSnapshot = await db.collection('properties').orderBy('createdAt', 'desc').get();
        const properties = propertiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json(properties);
    } catch (error: any) {
        console.error('API Error: Failed to fetch properties:', error);
        return NextResponse.json(
            { error: `Failed to fetch properties: ${error.message}` },
            { status: 500 }
        );
    }
}
