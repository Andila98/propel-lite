
'use server';

import type { NextRequest } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import { authConfig } from '@/config/server-config';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { getAuth } from "firebase-admin/auth";
import * as jose from 'jose';

const JWKS = jose.createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

/**
 * Verifies a session cookie on the Edge.
 * This is used in middleware, which runs in a lightweight, non-Node.js environment.
 * It uses the 'jose' library for JWT verification.
 * @param sessionCookie The session cookie string.
 * @returns The decoded claims of the authenticated user, or null if invalid.
 */
export async function verifySessionOnEdge(sessionCookie: string): Promise<DecodedIdToken | null> {
  try {
    const { payload } = await jose.jwtVerify(sessionCookie, JWKS, {
      issuer: `https://securetoken.google.com/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`,
      audience: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
    return payload as DecodedIdToken;
  } catch (error) {
    console.error("Edge session verification failed:", error);
    return null;
  }
}


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
