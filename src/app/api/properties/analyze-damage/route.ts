
'use server';

import { NextResponse, type NextRequest } from 'next/server';
import { analyzeDamage } from '@/ai/flows/analyze-damage-flow';
import { isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { AnalyzeDamageInputSchema } from '@/lib/schema-types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!isFirebaseAdminInitialized) {
    return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 500 });
  }
  
  try {
    const formData = await req.formData();
    const imageFile = formData.get('image') as File | null;
    
    if (!imageFile) {
        return NextResponse.json({ error: 'No image file provided.' }, { status: 400 });
    }
    
    // Convert the image to a data URI
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const photoDataUri = `data:${imageFile.type};base64,${buffer.toString('base64')}`;

    const input = { photoDataUri };
    
    const validation = AnalyzeDamageInputSchema.safeParse(input);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', details: validation.error.flatten() }, { status: 400 });
    }

    const result = await analyzeDamage(validation.data);
    return NextResponse.json(result, { status: 200 });

  } catch (error: unknown) {
    const typedError = error as Error;
    console.error('[ERROR: /api/properties/analyze-damage POST]', typedError);
    return NextResponse.json({ error: typedError.message || 'An internal server error occurred.' }, { status: 500 });
  }
}
