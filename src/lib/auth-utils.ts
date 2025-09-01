
import type { NextRequest } from 'next/server';
import { auth, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { authConfig } from '@/config/server-config';
import type { DecodedIdToken, UserRecord } from 'firebase-admin/auth';

// --- Enhanced Session Cache with Cleanup ---
interface CacheEntry {
    claims: DecodedIdToken;
    expires: number;
    lastAccessed: number;
}

class SessionCache {
    private cache = new Map<string, CacheEntry>();
    private readonly TTL_MS = 5 * 60 * 1000; // 5 minutes
    private readonly CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes
    private cleanupTimer?: NodeJS.Timeout;

    constructor() {
        this.startCleanup();
    }

    private startCleanup() {
        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, this.CLEANUP_INTERVAL);
    }

    private cleanup() {
        const now = Date.now();
        const keysToDelete: string[] = [];

        for (const [key, entry] of this.cache.entries()) {
            if (entry.expires < now) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => this.cache.delete(key));
        
        if (keysToDelete.length > 0) {
            console.debug(`[SessionCache] Cleaned up ${keysToDelete.length} expired entries`);
        }
    }

    get(sessionCookie: string): CacheEntry | null {
        const entry = this.cache.get(sessionCookie);
        if (!entry) return null;
        
        if (entry.expires <= Date.now()) {
            this.cache.delete(sessionCookie);
            return null;
        }
        
        // Update last accessed time
        entry.lastAccessed = Date.now();
        return entry;
    }

    set(sessionCookie: string, claims: DecodedIdToken): void {
        const now = Date.now();
        this.cache.set(sessionCookie, {
            claims,
            expires: now + this.TTL_MS,
            lastAccessed: now
        });
    }

    delete(sessionCookie: string): void {
        this.cache.delete(sessionCookie);
    }

    clear(): void {
        this.cache.clear();
    }

    getStats() {
        return {
            size: this.cache.size,
            entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
                key: key.substring(0, 10) + '...',
                expires: new Date(entry.expires).toISOString(),
                lastAccessed: new Date(entry.lastAccessed).toISOString()
            }))
        };
    }

    destroy() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        this.clear();
    }
}

const sessionCache = new SessionCache();

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
export async function verifySession(req: NextRequest): Promise<DecodedIdToken | null> {
    if (!isFirebaseAdminInitialized) {
        console.warn('[AuthUtils] Firebase Admin not initialized');
        return null;
    }

    const sessionCookie = req.cookies.get(authConfig.cookieName)?.value;
    if (!sessionCookie) {
        return null;
    }

    // Check cache first
    const cachedEntry = sessionCache.get(sessionCookie);
    if (cachedEntry) {
        return cachedEntry.claims;
    }

    try {
        const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
        
        // Cache the verified session
        sessionCache.set(sessionCookie, decodedClaims);
        
        return decodedClaims;
    } catch (error: any) {
        // Remove invalid session from cache
        sessionCache.delete(sessionCookie);
        
        // Log specific error types for monitoring
        if (error.code === 'auth/session-cookie-expired') {
            console.info('[AuthUtils] Session cookie expired');
        } else if (error.code === 'auth/session-cookie-revoked') {
            console.info('[AuthUtils] Session cookie revoked');
        } else {
            console.warn('[AuthUtils] Session verification failed:', error.code);
        }
        
        return null;
    }
}

/**
 * Enhanced landlord ID extraction with better role handling
 */
export async function getLandlordId(req: NextRequest): Promise<string | null> {
    const claims = await verifySession(req);
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

/**
 * Enhanced function for server actions with better error handling
 */
export async function getLandlordAndActor(reqOrCookie: NextRequest | string, directUidFetch = false): Promise<{
    landlordId: string | null;
    actor: UserRecord | null;
    error?: AuthError;
}> {
    if (!isFirebaseAdminInitialized) {
        return {
            landlordId: null,
            actor: null,
            error: new AuthError('Authentication service unavailable', 'SERVICE_UNAVAILABLE', 503)
        };
    }

    let claims: DecodedIdToken | null = null;
    let actor: UserRecord | null = null;

    if (directUidFetch && typeof reqOrCookie === 'string') {
        try {
            actor = await auth.getUser(reqOrCookie);
            claims = actor.customClaims as DecodedIdToken;
        } catch (e) {
            return {
                landlordId: null, actor: null,
                error: new AuthError('User not found', 'USER_NOT_FOUND', 404)
            };
        }
    } else if (reqOrCookie instanceof NextRequest) {
        claims = await verifySession(reqOrCookie);
        if (claims) {
            actor = await auth.getUser(claims.uid);
        }
    } else if (typeof reqOrCookie === 'string') {
        try {
            claims = await auth.verifySessionCookie(reqOrCookie, true);
            actor = await auth.getUser(claims.uid);
        } catch (error: any) {
             if (error.code === 'auth/session-cookie-expired') {
                return { landlordId: null, actor: null, error: new SessionExpiredError() };
            }
            return { landlordId: null, actor: null, error: new InvalidSessionError() };
        }
    }

    if (!claims || !actor) {
        return {
            landlordId: null,
            actor: null,
            error: new AuthError('No session found', 'NO_SESSION')
        };
    }

    try {
        let landlordId: string | null = null;
        const role = actor.customClaims?.role;

        switch (role) {
            case 'landlord':
                landlordId = actor.uid;
                break;
            case 'manager':
                landlordId = actor.customClaims?.landlordId || null;
                if (!landlordId) {
                    return {
                        landlordId: null,
                        actor: null,
                        error: new AuthError('Manager missing landlordId', 'INVALID_MANAGER_SETUP')
                    };
                }
                break;
            case 'admin':
                landlordId = null; 
                break;
            default:
                return {
                    landlordId: null,
                    actor: null,
                    error: new AuthError('Invalid role for this operation', 'INVALID_ROLE')
                };
        }
        
        return { landlordId, actor };
    } catch (error: any) {
        console.error('[AuthUtils] getLandlordAndActor failed:', error.code);
        return {
            landlordId: null,
            actor: null,
            error: new AuthError('Authentication failed', 'AUTH_ERROR', 500)
        };
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
