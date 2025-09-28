
import { NextResponse, type NextRequest } from 'next/server';
import { authConfig } from '@/config/server-config';
import { cookies } from 'next/headers';
import { auth, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { logoutRateLimit } from '@/lib/rate-limiter';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        await logoutRateLimit.check(req);
    } catch {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const cookieStore = await cookies();
    const cookieName = authConfig.cookieName;
    const sessionCookie = cookieStore.get(cookieName)?.value;

    try {
        // Only attempt to revoke tokens if a session cookie exists and the admin SDK is ready.
        if (sessionCookie && isFirebaseAdminInitialized) {
            // First, verify the session to get the user's UID.
            // Using verifySessionCookie is faster if the session is valid.
            const decodedClaims = await auth.verifySessionCookie(sessionCookie, true).catch(() => null);

            // If a valid session exists, revoke the refresh tokens to invalidate it on Firebase's side.
            if (decodedClaims) {
                await auth.revokeRefreshTokens(decodedClaims.uid);
            }
        }
    } catch (error: unknown) {
        console.error('[ERROR: /api/auth/logout] Failed to revoke refresh tokens:', error);
        // Do not re-throw. The main goal is to log out the user by deleting the cookie.
    } finally {
        // Always delete the client-side cookie, even if revocation fails.
        // This ensures the user is logged out from the application's perspective.
        cookieStore.delete(cookieName);
    }
    
    return NextResponse.json({ message: "Logged out successfully" }, { status: 200 });
}
