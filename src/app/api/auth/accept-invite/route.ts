
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    return NextResponse.json({ error: 'This feature is not available without Firebase.' }, { status: 501 });
}
