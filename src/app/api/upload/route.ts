
import { NextResponse, type NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        console.log('[DEBUG] Upload API called');
        
        const sessionCookie = req.cookies.get('RentEaseAuth')?.value;
        const decodedToken = await verifySession(sessionCookie);

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

        // TODO: Add your actual storage upload logic here
        // For now, return a placeholder URL
        const mockUrl = `https://placehold.co/800x500.png`;
        
        console.log('[DEBUG] Returning mock URL:', mockUrl);
        return NextResponse.json({ url: mockUrl });

    } catch (error: any) {
        console.error('[ERROR] Upload failed:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        
        return NextResponse.json({ 
            error: 'Upload failed',
            details: error.message 
        }, { status: 500 });
    }
}
