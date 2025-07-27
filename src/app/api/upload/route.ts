
import { type NextRequest, NextResponse } from 'next/server';
import multer from 'multer';
import { db, bucket, admin } from '@/lib/firebase-admin';

// Initialize multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB limit
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

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('media') as File | null;
    const title = formData.get('title') as string | null;
    const propertyName = formData.get('propertyName') as string | null;

    if (!file || !title || !propertyName) {
      return NextResponse.json(
        { error: 'Missing title, propertyName or media file.' },
        { status: 400 }
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
    });
  } catch (error: any) {
    console.error('Upload failed:', error);
    return NextResponse.json(
      { error: `Upload failed: ${error.message}` },
      { status: 500 }
    );
  }
}

// This is not needed for App Router but good practice to have if you have GET, etc.
export async function GET() {
    return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
