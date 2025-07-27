
import { type NextRequest, NextResponse } from 'next/server';
import multer from 'multer';
import { db, bucket, admin } from '@/lib/firebase-admin';

const MAX_FILE_SIZE_MB = 20;

// Initialize multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024, // 20 MB limit
  },
});

// Helper to promisify multer
const runMiddleware = (
  req: NextRequest,
  fn: (
    req: any,
    res: any,
    callback: (result: any) => void
  ) => void
): Promise<any> => {
  return new Promise((resolve, reject) => {
    fn(req, new Response(), (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
};

const getFolder = (mimetype: string) => {
  if (mimetype.startsWith('image/')) return 'images';
  if (mimetype.startsWith('video/')) return 'videos';
  return 'others';
};

const isValidFile = (file: File) => {
  const allowedTypes = ["image/", "video/"];
  const isAllowedType = allowedTypes.some(type => file.type.startsWith(type));
  const isWithinSize = file.size <= MAX_FILE_SIZE_MB * 1024 * 1024;
  return isAllowedType && isWithinSize;
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
    const title = formData.get('title') as string | null;
    const propertyName = formData.get('propertyName') as string | null;

    if (!file || !title || !propertyName) {
      return NextResponse.json(
        { error: 'Missing title, propertyName or media file.' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!isValidFile(file)) {
      return NextResponse.json(
        { error: `Invalid file. Must be an image or video and under ${MAX_FILE_SIZE_MB}MB.` },
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

    // We're using the public URL for simplicity here.
    // For production apps, signed URLs are recommended for private content.
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    const docRef = await db.collection('mediaFiles').add({
      title,
      propertyName,
      mediaType: folder,
      mediaUrl: publicUrl,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      id: docRef.id,
      title,
      propertyName,
      url: publicUrl,
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
    return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405, headers: corsHeaders });
}
