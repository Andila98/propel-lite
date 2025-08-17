
import { type NextRequest, NextResponse } from 'next/server';
import { isFirebaseAdminInitialized } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
    if (!isFirebaseAdminInitialized) {
        return NextResponse.json({ error: 'Firebase not configured.' }, { status: 500 });
    }
  return NextResponse.json({ error: 'This feature is not yet implemented.' }, { status: 501 });
}
