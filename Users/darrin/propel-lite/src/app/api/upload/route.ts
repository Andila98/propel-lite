
import { type NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '@/lib/storage-service';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
        }
        
        const fileUrl = await uploadFile(file);

        return NextResponse.json({ url: fileUrl });
    } catch (error: any) {
        return NextResponse.json({ error: `Failed to upload file: ${error.message}` }, { status: 500 });
    }
}
