
import { NextResponse, type NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth-utils';
import { uploadToSupabase } from '@/lib/supabase-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        console.log('[DEBUG] Upload API called');
        
        const decodedToken = await verifySession(req.cookies.get('RentEaseAuth')?.value);
        if (!decodedToken) {
            console.log('[DEBUG] No valid token');
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        console.log('[DEBUG] User authenticated:', decodedToken.uid);

        const formData = await req.formData();
        const file = formData.get('file') as File;
        
        if (!file) {
            console.log('[DEBUG] No file provided');
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        console.log('[DEBUG] File details:', { 
            name: file.name, 
            size: file.size, 
            type: file.type 
        });

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        console.log('[DEBUG] File converted to buffer, size:', arrayBuffer.byteLength);

        try {
            const timestamp = Date.now();
            const randomSuffix = Math.random().toString(36).substring(2, 8);
            const fileExtension = file.name.split('.').pop();
            const fileName = `${decodedToken.uid}_${timestamp}_${randomSuffix}.${fileExtension}`;

            console.log('[DEBUG] Uploading to Supabase with filename:', fileName);
            const url = await uploadToSupabase(arrayBuffer, fileName, file.type);
            
            console.log('[DEBUG] Upload successful:', url);
            return NextResponse.json({ url });
            
        } catch (uploadError: unknown) {
            const typedError = uploadError as Error;
            console.error('[ERROR] Supabase upload failed:', typedError);
            return NextResponse.json({ 
                error: 'Storage upload failed',
                details: typedError.message 
            }, { status: 500 });
        }

    } catch (error: unknown) {
        const typedError = error as Error;
        console.error('[ERROR] Upload failed:', {
            name: typedError.name,
            message: typedError.message,
            stack: typedError.stack
        });
        
        return NextResponse.json({ 
            error: 'Upload failed',
            details: typedError.message 
        }, { status: 500 });
    }
}
