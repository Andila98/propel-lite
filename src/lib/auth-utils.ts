
'use server';

import type { NextRequest } from 'next/server';
import { auth, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { authConfig } from '@/config/server-config';
import type { DecodedIdToken, UserRecord } from 'firebase-admin/auth';


/**
 * Verifies the session cookie from a request on the server (Node.js runtime).
 * @param req - The NextRequest object.
 * @returns The decoded claims of the authenticated user, or null if unauthorized.
 */
export async function verifySession(req: NextRequest): Promise<DecodedIdToken | null> {
    if (!isFirebaseAdminInitialized) return null;
    const sessionCookie = req.cookies.get(authConfig.cookieName)?.value;
    if (!sessionCookie) {
        return null;
    }

    try {
        const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
        return decodedClaims;
    } catch (error) {
        // Session cookie is invalid.
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
    
    if (claims.role === 'manager') {
        // The landlordId custom claim is set when the manager is invited/created.
        return claims.landlordId || null;
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
        const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
        const actor = await auth.getUser(decodedClaims.uid);
        
        let landlordId: string | null = null;
        if (actor.customClaims?.role === 'landlord') {
            landlordId = actor.uid;
        } else if (actor.customClaims?.role === 'manager') {
            landlordId = actor.customClaims?.landlordId;
        }
        
        return { landlordId, actor };
    } catch (error) {
        return { landlordId: null, actor: null };
    }
}
