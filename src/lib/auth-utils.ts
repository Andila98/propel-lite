
import type { NextRequest } from 'next/server';
import { auth, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import type { DecodedIdToken, UserRecord } from 'firebase-admin/auth';

// Enhanced error types for better error handling
export class AuthError extends Error {
    constructor(
        message: string,
        public code: string,
        public statusCode: number = 401
    ) {
        super(message);
        this.name = 'AuthError';
    }
}

export class SessionExpiredError extends AuthError {
    constructor() {
        super('Session has expired', 'SESSION_EXPIRED', 401);
    }
}

export class InvalidSessionError extends AuthError {
    constructor() {
        super('Invalid session', 'INVALID_SESSION', 401);
    }
}

/**
 * Enhanced session verification with better error handling and logging
 */
export async function verifySession(sessionCookie: string | undefined | null): Promise<DecodedIdToken | null> {
    if (!isFirebaseAdminInitialized) {
        console.warn('[AuthUtils] Firebase Admin not initialized');
        return null;
    }

    if (!sessionCookie) {
        return null;
    }

    try {
        const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
        return decodedClaims;
    } catch (error: unknown) {
        const typedError = error as { code: string };
        // Log specific error types for monitoring
        if (typedError.code === 'auth/session-cookie-expired') {
            console.info('[AuthUtils] Session cookie expired');
        } else if (typedError.code === 'auth/session-cookie-revoked') {
            console.info('[AuthUtils] Session cookie revoked');
        } else {
            console.warn('[AuthUtils] Session verification failed:', typedError.code);
        }
        
        return null;
    }
}

/**
 * Enhanced landlord ID extraction with better role handling
 */
export async function getLandlordId(sessionCookie: string | undefined | null): Promise<string | null> {
    const claims = await verifySession(sessionCookie);
    if (!claims) return null;

    // Direct landlord access
    if (claims.role === 'landlord') {
        return claims.uid;
    }
    
    // Manager access - must have landlordId in claims
    if (claims.role === 'manager' && claims.landlordId) {
        return claims.landlordId;
    }

    // Admin access - special handling if needed
    if (claims.role === 'admin') {
        // Admins might need special logic here
        // For now, return null as they don't have a specific landlordId
        return null;
    }

    return null;
}

// Result type for getLandlordAndActor
type GetActorResult = {
    landlordId: string | null;
    actor: UserRecord | null;
    error?: AuthError;
};


async function getActorFromUid(uid: string): Promise<GetActorResult> {
    try {
        const actor = await auth.getUser(uid);
        const role = actor.customClaims?.role;
        let landlordId: string | null = null;
        
        switch (role) {
            case 'landlord':
                landlordId = actor.uid;
                break;
            case 'manager':
                landlordId = actor.customClaims?.landlordId;
                if (!landlordId) {
                    return { landlordId: null, actor, error: new AuthError('Manager is not linked to a landlord', 'INVALID_MANAGER_SETUP', 403) };
                }
                break;
        }

        return { landlordId, actor };
    } catch {
        return { landlordId: null, actor: null, error: new AuthError('User not found', 'USER_NOT_FOUND', 404) };
    }
}


async function getActorFromCookie(cookie: string): Promise<GetActorResult> {
    try {
        const claims = await auth.verifySessionCookie(cookie, true);
        return getActorFromUid(claims.uid);
    } catch (error: unknown) {
        const typedError = error as { code: string };
        if (typedError.code === 'auth/session-cookie-expired') {
            return { landlordId: null, actor: null, error: new SessionExpiredError() };
        }
        return { landlordId: null, actor: null, error: new InvalidSessionError() };
    }
}

/**
 * Enhanced function to get the acting user (actor) and their associated landlord ID.
 * It can operate based on a session cookie or directly from a UID.
 */
export async function getLandlordAndActor(
    identifier: string,
    isUid: boolean = false
): Promise<GetActorResult> {
    if (!isFirebaseAdminInitialized) {
        return {
            landlordId: null,
            actor: null,
            error: new AuthError('Authentication service unavailable', 'SERVICE_UNAVAILABLE', 503)
        };
    }
    
    if (isUid) {
        return getActorFromUid(identifier);
    } else {
        return getActorFromCookie(identifier);
    }
}


/**
 * Utility to get client IP from request
 */
export function getClientIP(req: NextRequest): string {
    const forwarded = req.headers.get('x-forwarded-for');
    const realIP = req.headers.get('x-real-ip');
    const remoteAddr = req.headers.get('remote-addr');
    
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    
    return realIP || remoteAddr || 'unknown';
}

/**
 * Create a request context for logging and debugging
 */
export function createRequestContext(req: NextRequest) {
    return {
        ip: getClientIP(req),
        userAgent: req.headers.get('user-agent'),
        timestamp: new Date().toISOString(),
        path: req.nextUrl.pathname,
        method: req.method
    };
}
