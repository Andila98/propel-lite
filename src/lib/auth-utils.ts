
'use server';

import type { NextRequest } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import { authConfig } from '@/config/server-config';
import type { DecodedIdToken } from 'firebase-admin/auth';


/**
 * Verifies the session cookie from a request on the server (Node.js runtime).
 * @param req - The NextRequest object.
 * @returns The decoded claims of the authenticated user, or null if unauthorized.
 */
export async function verifySession(req: NextRequest): Promise<DecodedIdToken | null> {
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
 * Verifies the session cookie from a request and returns the user's UID.
 * @param req - The NextRequest object.
 * @returns The UID of the authenticated user, or null if unauthorized.
 */
export async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
    const decodedClaims = await verifySession(req);
    return decodedClaims?.uid || null;
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
