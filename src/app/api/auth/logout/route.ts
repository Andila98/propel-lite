
import { NextResponse } from 'next/server';
import { authConfig } from '@/config/server-config';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

export async function POST() {
    try {
        const cookieStore = cookies();
        const cookieName = authConfig.cookieName;

        cookieStore.delete(cookieName);
        
        return NextResponse.json({ message: "Logged out successfully" }, { status: 200 });

    } catch (error: any) {
        console.error('[ERROR: /api/auth/logout]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
