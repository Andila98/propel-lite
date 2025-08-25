
import { NextResponse } from 'next/server';
import { authConfig } from '@/config/server-config';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

export async function POST() {
    try {
        const cookieStore = cookies();
        const cookieName = authConfig.cookieName;

        // Clear the session cookie
        cookieStore.delete(cookieName);

        // In a high-security application, you could also revoke the session cookie
        // on the server side to invalidate it immediately. For this app, clearing
        // the client's cookie is sufficient.
        
        return NextResponse.json({ message: "Logged out successfully" }, { status: 200 });

    } catch (error: any) {
        console.error('[AUTH_LOGOUT_ERROR]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
