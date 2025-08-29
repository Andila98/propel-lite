
import { NextResponse, type NextRequest } from 'next/server';
import { authConfig } from '@/config/server-config';
import { cookies } from 'next/headers';
import { auth, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { verifySession } from '@/lib/auth-utils';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    const cookieStore = cookies();
    const cookieName = authConfig.cookieName;

    try {
        if (isFirebaseAdminInitialized) {
            // First, verify the session to get the user's UID
            const decodedClaims = await verifySession(req);

            // If a valid session exists, revoke the refresh tokens to invalidate it on Firebase's side
            if (decodedClaims) {
                await auth.revokeRefreshTokens(decodedClaims.uid);
            }
        }

        // Always delete the client-side cookie
        cookieStore.delete(cookieName);
        
        return NextResponse.json({ message: "Logged out successfully" }, { status: 200 });

    } catch (error: any) {
        console.error('[ERROR: /api/auth/logout]', error);
        // Still attempt to delete the cookie even if revocation fails
        cookieStore.delete(cookieName);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
