
import { NextResponse, type NextRequest } from 'next/server';
import { uploadFile } from '@/lib/storage-service';
import { compressFile } from '@/lib/client/compress';

export const runtime = 'nodejs';

// This route is not used anymore as file uploads are handled directly in server actions.
// It can be safely deleted.
export async function POST(req: NextRequest) {
  return NextResponse.json({ error: 'This endpoint is deprecated.' }, { status: 410 });
}
