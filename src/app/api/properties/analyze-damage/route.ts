import { type NextRequest, NextResponse } from 'next/server';
import { analyzeDamage } from '@/ai/flows/analyze-damage-flow';
import { isFirebaseAdminInitialized } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
    if (!isFirebaseAdminInitialized) {
        return NextResponse.json({ error: 'AI features are not configured.' }, { status: 500 });
    }

    try {
        const formData = await req.formData();
        const image = formData.get('image') as File | null;

        if (!image) {
            return NextResponse.json({ error: 'No image provided.' }, { status: 400 });
        }
        
        // Convert image to a Data URI
        const imageBuffer = await image.arrayBuffer();
        const photoDataUri = `data:${image.type};base64,${Buffer.from(imageBuffer).toString('base64')}`;
        
        const result = await analyzeDamage({ photoDataUri });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[ANALYZE_DAMAGE_API_ERROR]', error);
        return NextResponse.json({ error: 'Failed to analyze image.' }, { status: 500 });
    }
}
