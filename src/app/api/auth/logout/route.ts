
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

        // Can also revoke the session cookie on the server side if needed
        // This requires getting the session cookie from the request and using auth.revokeRefreshTokens()
        
        return NextResponse.json({ message: "Logged out successfully" }, { status: 200 });

    } catch (error: any) {
        console.error('[AUTH_LOGOUT_ERROR]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
