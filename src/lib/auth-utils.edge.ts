
'use server';

import { firebaseConfig } from '@/config/firebase-config';
import type { DecodedIdToken } from 'firebase-admin/auth';
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
      issuer: `https://securetoken.google.com/${firebaseConfig.projectId}`,
      audience: firebaseConfig.projectId,
    });
    return payload as DecodedIdToken;
  } catch (error) {
    console.error("Edge session verification failed:", error);
    return null;
  }
}
