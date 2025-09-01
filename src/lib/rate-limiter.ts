// lib/rate-limiter.ts
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

// Factory function to create rate limiter middleware
export default function rateLimit(options: RateLimitOptions) {
    const limiter = new RateLimiter(options);

    return async (req: NextRequest) => {
        const result = await limiter.check(req);

        if (!result.allowed) {
            const error: any = new Error('Rate limit exceeded');
            error.code = 'RATE_LIMIT_EXCEEDED';
            error.statusCode = 429;
            error.resetTime = result.resetTime;
            error.remaining = result.remaining;
            throw error;
        }

        return result;
    };
}

// Pre-configured rate limiters for common use cases
export const loginRateLimit = rateLimit({
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

export const registrationRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 registration attempts per IP per hour
    keyGenerator: (req: NextRequest) => {
        const forwarded = req.headers.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown';
        return `register:${ip}`;
    }
});

export const passwordResetRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 password reset attempts per IP per hour
    keyGenerator: (req: NextRequest) => {
        const forwarded = req.headers.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown';
        return `password-reset:${ip}`;
    }
});

export const inviteManagerRateLimit = rateLimit({
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

// Rate limiter for API endpoints that require user authentication
export const createUserBasedRateLimit = (
    windowMs: number,
    max: number,
    action: string
) => rateLimit({
    windowMs,
    max,
    keyGenerator: (req: NextRequest) => {
        // This would need to be used after authentication middleware
        // where user ID is available in the request context
        const userId = (req as any).userId || 'anonymous';
        return `${action}:${userId}`;
    }
});

// Enhanced rate limiter with progressive delays
export class ProgressiveRateLimiter {
    private attempts = new Map<string, number[]>();
    private delays = [1000, 5000, 15000, 60000]; // 1s, 5s, 15s, 1m delays

    async checkWithDelay(key: string): Promise<number> {
        const now = Date.now();
        const userAttempts = this.attempts.get(key) || [];
        
        // Remove attempts older than 1 hour
        const recentAttempts = userAttempts.filter(time => now - time < 60 * 60 * 1000);
        
        if (recentAttempts.length === 0) {
            this.attempts.set(key, [now]);
            return 0; // No delay for first attempt
        }

        const delayIndex = Math.min(recentAttempts.length - 1, this.delays.length - 1);
        const delay = this.delays[delayIndex];
        
        recentAttempts.push(now);
        this.attempts.set(key, recentAttempts);
        
        return delay;
    }

    reset(key: string) {
        this.attempts.delete(key);
    }
}

// Utility to add rate limit headers to responses
export function addRateLimitHeaders(
    response: Response,
    result: { remaining: number; resetTime: number; totalAttempts: number }
) {
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    response.headers.set('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString());
    response.headers.set('X-RateLimit-Limit', result.totalAttempts.toString());
    return response;
}
