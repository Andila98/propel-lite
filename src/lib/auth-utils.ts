
'use server';

import type { NextRequest } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import { authConfig } from '@/config/server-config';

/**
 * Verifies the session cookie from a request and returns the user's UID.
 * @param req - The NextRequest object.
 * @returns The UID of the authenticated user, or null if unauthorized.
 */
export async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
    const sessionCookie = req.cookies.get(authConfig.cookieName)?.value;
    if (!sessionCookie) {
        console.log('[AUTH_UTILS] No session cookie found in request.');
        return null;
    }

    try {
        const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
        return decodedClaims.uid;
    } catch (error) {
        console.error('[AUTH_UTILS] Could not verify session cookie:', error);
        return null;
    }
}
