
'use server';

import type { NextRequest } from 'next/server';
import { auth, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { authConfig } from '@/config/server-config';
import type { DecodedIdToken, UserRecord } from 'firebase-admin/auth';

// --- Session Cache ---
interface CacheEntry {
    claims: DecodedIdToken;
    expires: number; // Expiration timestamp in milliseconds
}
const sessionCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Verifies the session cookie from a request on the server (Node.js runtime).
 * It uses an in-memory cache to reduce latency from repeated Firebase checks.
 * @param req - The NextRequest object.
 * @returns The decoded claims of the authenticated user, or null if unauthorized.
 */
export async function verifySession(req: NextRequest): Promise<DecodedIdToken | null> {
    if (!isFirebaseAdminInitialized) return null;
    const sessionCookie = req.cookies.get(authConfig.cookieName)?.value;
    if (!sessionCookie) {
        return null;
    }

    // 1. Check the cache first
    const cachedEntry = sessionCache.get(sessionCookie);
    if (cachedEntry && cachedEntry.expires > Date.now()) {
        return cachedEntry.claims;
    }

    try {
        // 2. If not in cache or expired, verify with Firebase
        const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
        
        // 3. Add the new entry to the cache
        sessionCache.set(sessionCookie, {
            claims: decodedClaims,
            expires: Date.now() + CACHE_TTL_MS,
        });

        return decodedClaims;
    } catch (error) {
        // Session cookie is invalid, clear from cache if it exists
        sessionCache.delete(sessionCookie);
        return null;
    }
}


/**
 * Verifies the session cookie and determines the effective landlord ID for the request.
 * If the user is a landlord, it's their own UID.
 * If the user is a manager, it's the landlordId associated with their account.
 * This is the primary function for authorizing access to resources.
 * @param req - The NextRequest object.
 * @returns The UID of the landlord who owns the resources, or null if unauthorized.
 */
export async function getLandlordId(req: NextRequest): Promise<string | null> {
    const claims = await verifySession(req);
    if (!claims) return null;

    if (claims.role === 'landlord') {
        return claims.uid;
    }
    
    // For managers, the landlordId MUST be present in their claims.
    if (claims.role === 'manager' && claims.landlordId) {
        return claims.landlordId;
    }

    return null; // Tenants or other roles do not have a landlordId in this context.
}

/**
 * For server actions, gets the Landlord ID and acting user from the session cookie.
 * @param sessionCookie The session cookie value from the request.
 * @returns An object with landlordId and the actor's UserRecord, or nulls if invalid.
 */
export async function getLandlordAndActor(sessionCookie: string): Promise<{ landlordId: string | null; actor: UserRecord | null; }> {
    if (!sessionCookie) {
        return { landlordId: null, actor: null };
    }
    try {
        // We don't use the cache here because server actions are less frequent and might be more sensitive.
        // Direct verification ensures permissions are always fresh for mutation operations.
        const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
        const actor = await auth.getUser(decodedClaims.uid);
        
        let landlordId: string | null = null;
        if (actor.customClaims?.role === 'landlord') {
            landlordId = actor.uid;
        } else if (actor.customClaims?.role === 'manager' && actor.customClaims?.landlordId) {
            landlordId = actor.customClaims?.landlordId;
        }
        
        return { landlordId, actor };
    } catch (error) {
        return { landlordId: null, actor: null };
    }
}
