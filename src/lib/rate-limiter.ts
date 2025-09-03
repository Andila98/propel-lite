
import type { NextRequest } from 'next/server';

interface RateLimitEntry {
    count: number;
    firstRequest: number;
}

interface RateLimitOptions {
    windowMs: number;
    max: number;
    keyGenerator: (req: NextRequest) => string;
    onLimitReached?: (key: string, req: NextRequest) => void;
}

export class RateLimiter {
    private store = new Map<string, RateLimitEntry>();
    private cleanupInterval: NodeJS.Timeout;

    constructor(private options: RateLimitOptions) {
        // Run cleanup every 5 minutes
        this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }

    private cleanup() {
        const now = Date.now();
        const keysToDelete: string[] = [];
        for (const [key, entry] of this.store.entries()) {
            if (now > entry.firstRequest + this.options.windowMs) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.store.delete(key));
    }

    public async check(req: NextRequest): Promise<{ allowed: boolean; remaining: number; resetTime: number; }> {
        const key = this.options.keyGenerator(req);
        const now = Date.now();
        
        let entry = this.store.get(key);

        if (!entry || now > entry.firstRequest + this.options.windowMs) {
            entry = { count: 1, firstRequest: now };
            this.store.set(key, entry);
        } else {
            entry.count++;
        }

        const allowed = entry.count <= this.options.max;
        const remaining = allowed ? this.options.max - entry.count : 0;
        const resetTime = entry.firstRequest + this.options.windowMs;

        if (!allowed) {
            if(this.options.onLimitReached) {
                this.options.onLimitReached(key, req);
            }
            // Throw an error to be caught by the route handler
            throw new Error('Rate limit exceeded');
        }

        return { allowed, remaining, resetTime };
    }

    public destroy() {
        clearInterval(this.cleanupInterval);
        this.store.clear();
    }
}

const getIp = (req: NextRequest) => {
    return req.ip ?? req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
}

export const loginRateLimit = new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Increased from 5 to 100 for development
    keyGenerator: (req) => `login:${getIp(req)}`,
    onLimitReached: (key, req) => {
        console.warn(`[SECURITY] Rate limit exceeded for ${key}`, {
            userAgent: req.headers.get('user-agent'),
            path: req.nextUrl.pathname,
            timestamp: new Date().toISOString()
        });
    }
});

export const logoutRateLimit = new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 logout attempts per IP per window
    keyGenerator: (req) => `logout:${getIp(req)}`,
});

export const registrationRateLimit = new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    keyGenerator: (req) => `register:${getIp(req)}`,
});

export const passwordResetRateLimit = new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    keyGenerator: (req) => `password-reset:${getIp(req)}`,
});

export const inviteManagerRateLimit = new RateLimiter({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 10,
    keyGenerator: (req) => `invite-manager:${getIp(req)}`,
});
