
'use server';

import type { NextRequest } from 'next/server';
import { auth, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { authConfig } from '@/config/server-config';
import type { DecodedIdToken } from 'firebase-admin/auth';


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
        return claims.landlordId || null;
    }

    return null; // Only landlords and managers have an associated landlordId
}

/**
 * A utility for API routes to verify that a user is authenticated and has a specific role.
 * @param req The incoming NextRequest.
 * @param requiredRole The role required to access the resource.
 * @returns The user's decoded token if authorized, otherwise null.
 */
export async function verifyUserAndRole(req: NextRequest, requiredRole: 'landlord' | 'manager' | 'tenant'): Promise<DecodedIdToken | null> {
    const decodedClaims = await verifySession(req);
    if (!decodedClaims || decodedClaims.role !== requiredRole) {
        return null;
    }
    return decodedClaims;
}
