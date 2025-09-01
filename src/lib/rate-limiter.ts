
import type { NextRequest } from 'next/server';

interface RateLimitEntry {
    count: number;
    firstRequest: number;
    lastRequest: number;
}

interface RateLimitOptions {
    windowMs: number; // Time window in milliseconds
    max: number; // Maximum number of requests per window
    keyGenerator: (req: NextRequest) => string; // Function to generate rate limit key
    skipHeaders?: boolean; // Whether to skip adding rate limit headers
    onLimitReached?: (key: string, req: NextRequest) => void; // Callback when limit is reached
}

class RateLimiter {
    private store = new Map<string, RateLimitEntry>();
    private cleanupInterval: NodeJS.Timeout;

    constructor(private options: RateLimitOptions) {
        // Clean up expired entries every 5 minutes
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 5 * 60 * 1000);
    }

    private cleanup() {
        const now = Date.now();
        const keysToDelete: string[] = [];

        for (const [key, entry] of this.store.entries()) {
            if (now - entry.firstRequest > this.options.windowMs) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => this.store.delete(key));
        
        if (keysToDelete.length > 0) {
            console.debug(`[RateLimiter] Cleaned up ${keysToDelete.length} expired entries`);
        }
    }

    async check(req: NextRequest): Promise<{
        allowed: boolean;
        remaining: number;
        resetTime: number;
        totalAttempts: number;
    }> {
        const key = this.options.keyGenerator(req);
        const now = Date.now();
        
        let entry = this.store.get(key);

        // If no entry exists or the window has expired, create a new one
        if (!entry || (now - entry.firstRequest) > this.options.windowMs) {
            entry = {
                count: 1,
                firstRequest: now,
                lastRequest: now
            };
            this.store.set(key, entry);
            
            return {
                allowed: true,
                remaining: this.options.max - 1,
                resetTime: now + this.options.windowMs,
                totalAttempts: 1
            };
        }

        // Increment the count
        entry.count++;
        entry.lastRequest = now;

        const allowed = entry.count <= this.options.max;
        const remaining = Math.max(0, this.options.max - entry.count);
        const resetTime = entry.firstRequest + this.options.windowMs;

        if (!allowed && this.options.onLimitReached) {
            this.options.onLimitReached(key, req);
        }

        return {
            allowed,
            remaining,
            resetTime,
            totalAttempts: entry.count
        };
    }

    getStats() {
        return {
            totalKeys: this.store.size,
            entries: Array.from(this.store.entries()).map(([key, entry]) => ({
                key: key.length > 20 ? key.substring(0, 20) + '...' : key,
                count: entry.count,
                firstRequest: new Date(entry.firstRequest).toISOString(),
                lastRequest: new Date(entry.lastRequest).toISOString()
            }))
        };
    }

    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.store.clear();
    }
}

// Factory to create rate limiters
const createRateLimiter = (options: RateLimitOptions) => new RateLimiter(options);


// Pre-configured rate limiters for common use cases
export const loginRateLimit = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per IP per window
    keyGenerator: (req: NextRequest) => {
        const forwarded = req.headers.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown';
        return `login:${ip}`;
    },
    onLimitReached: (key: string, req: NextRequest) => {
        console.warn(`[Security] Rate limit exceeded for ${key}`, {
            userAgent: req.headers.get('user-agent'),
            path: req.nextUrl.pathname,
            timestamp: new Date().toISOString()
        });
    }
});

export const registrationRateLimit = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 registration attempts per IP per hour
    keyGenerator: (req: NextRequest) => {
        const forwarded = req.headers.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown';
        return `register:${ip}`;
    }
});

export const passwordResetRateLimit = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 password reset attempts per IP per hour
    keyGenerator: (req: NextRequest) => {
        const forwarded = req.headers.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown';
        return `password-reset:${ip}`;
    }
});

export const inviteManagerRateLimit = createRateLimiter({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 10, // 10 manager invitations per user per day
    keyGenerator: (req: NextRequest) => {
        // This should be called after authentication, so we'd need to extract user ID
        // For now, using IP as fallback, but ideally this would be user-based
        const forwarded = req.headers.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown';
        return `invite-manager:${ip}`;
    }
});
