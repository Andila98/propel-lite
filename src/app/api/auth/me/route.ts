
import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyFirebaseToken } from '@/lib/server-utils';

export async function GET(req: NextRequest) {
  try {
    const { userId, role, landlordId } = await verifyFirebaseToken(req);
    return NextResponse.json({ userId, role, landlordId });
  } catch (err: any) {
    console.error('[ME_ENDPOINT_ERROR]', err);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
