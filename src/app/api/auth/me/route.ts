
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  return NextResponse.json({ error: 'Firebase not configured.' }, { status: 500 });
}
