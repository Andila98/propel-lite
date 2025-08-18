
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    return NextResponse.json({ 
        message: 'Mock signup successful. Please log in.',
        userId: `mock_user_${Date.now()}`
    }, { status: 201 });
}
