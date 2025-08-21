
import { type NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '@/lib/storage-service';
import { isFirebaseAdminInitialized } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
    // Note: We're checking for isFirebaseAdminInitialized here because storage-service depends on it.
    if (!isFirebaseAdminInitialized) {
        console.error('[API_UPLOAD] Firebase Admin is not initialized.');
        return NextResponse.json({ error: 'Storage service is not configured. Please check server credentials.' }, { status: 500 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
        }
        
        const fileUrl = await uploadFile(file);

        return NextResponse.json({ url: fileUrl });
    } catch (error: any) {
        console.error('[API_UPLOAD_ERROR]', error);
        return NextResponse.json({ error: `Failed to upload file: ${error.message}` }, { status: 500 });
    }
}
