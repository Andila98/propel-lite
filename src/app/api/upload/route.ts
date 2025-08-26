
'use server';

import { NextResponse, type NextRequest } from 'next/server';
import { uploadFile } from '@/lib/storage-service';
import { isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { verifySession } from '@/lib/auth-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    if (!isFirebaseAdminInitialized) {
        return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 500 });
    }
    
    const decodedToken = await verifySession(req);
    if (!decodedToken) {
        return NextResponse.json({ error: 'Unauthorized: You must be logged in to upload files.' }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        
        if (!file) {
            return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
        }
        
        const url = await uploadFile(file);
        
        return NextResponse.json({ url });
    } catch (error: any) {
        console.error('[ERROR: /api/upload]', error);
        return NextResponse.json({ error: 'An internal server error occurred during file upload.' }, { status: 500 });
    }
}
