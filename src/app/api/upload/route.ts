import { type NextRequest, NextResponse } from 'next/server';
import multer from 'multer';
import { db, admin } from '@/lib/firebase-admin';
import type { Property, Unit } from '@/lib/types';
import path from 'path';
import fs from 'fs';

const uploadDir = path.join(process.cwd(), 'public/uploads');

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

export async function POST(req: NextRequest) {
  const res = new NextResponse();

  try {
    // Because Next.js's request object is a stream, we need to convert it to something multer can handle.
    // We can't use the standard `req` and `res` from Express/Node directly in App Router.
    // This approach uses a middleware runner to adapt multer for Next.js App Router.
    
    const tempReq: any = req;
    const tempRes: any = res;

    await runMiddleware(tempReq, tempRes, upload.single('media'));

    // After multer has run, the file will be on tempReq.file
    const file = tempReq.file;
    const propertyDataString = tempReq.body.propertyData;

    if (!file || !propertyDataString) {
      return NextResponse.json(
        { error: 'Missing propertyData or media file.' },
        { status: 400 }
      );
    }

    const propertyData = JSON.parse(propertyDataString);
    
    // The public URL will be a local path
    const publicUrl = `/uploads/${file.filename}`;

    // Now, save property data to Firestore
    const totalRent = propertyData.units.reduce((acc: number, unit: Unit) => acc + (unit.rent || 0), 0);
    const totalBedrooms = propertyData.units.reduce((acc: number, unit: Unit) => {
        const type = unit.unitType;
        if (type === 'one-bedroom') return acc + 1;
        if (type === 'two-bedroom') return acc + 2;
        if (type === 'three-bedroom') return acc + 3;
        return acc;
    }, 0);
     const totalBathrooms = propertyData.units.reduce((acc: number, unit: Unit) => {
        const type = unit.unitType;
        if (type === 'one-bedroom' || type === 'two-bedroom' || type === 'three-bedroom') return acc + 1;
        return acc;
    }, 0);
     const totalSquareFootage = propertyData.units.reduce((acc: number, unit: Unit) => acc + (unit.squareFootage || 0), 0);

    const newProperty: Omit<Property, 'id'> = {
      address: propertyData.address,
      propertyType: propertyData.propertyType,
      imageUrl: publicUrl,
      rent: totalRent,
      bedrooms: totalBedrooms,
      bathrooms: totalBathrooms,
      squareFootage: totalSquareFootage,
      description: "Default description, please update.",
      units: propertyData.units,
      landlordId: propertyData.landlordId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('properties').add(newProperty);

    return NextResponse.json({
      id: docRef.id,
      ...newProperty,
      imageUrl: publicUrl, // ensure local URL is returned
    });

  } catch (error: any) {
    console.error('Upload failed:', error);
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
        console.error('Failed to fetch properties:', error);
        return NextResponse.json(
            { error: `Failed to fetch properties: ${error.message}` },
            { status: 500 }
        );
    }
}