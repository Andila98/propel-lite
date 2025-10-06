
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type { NextRequest } from 'next/server';
import { getClientIP } from './auth-utils';

const isDevelopment = process.env.NODE_ENV === 'development';

// Initialize Redis client (only if credentials exist)
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// Fallback in-memory rate limiter for development
class InMemoryRateLimiter {
  private requests = new Map<string, number[]>();
  
  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  async limit(identifier: string): Promise<{ success: boolean }> {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Get existing requests for this identifier
    const timestamps = this.requests.get(identifier) || [];
    
    // Filter out old requests
    const recentRequests = timestamps.filter(time => time > windowStart);
    
    // Check if limit exceeded
    if (recentRequests.length >= this.maxRequests) {
      return { success: false };
    }
    
    // Add current request
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);
    
    // Cleanup old entries periodically
    if (this.requests.size > 1000) {
      this.cleanup(windowStart);
    }
    
    return { success: true };
  }

  private cleanup(windowStart: number) {
    for (const [key, timestamps] of this.requests.entries()) {
      const recentRequests = timestamps.filter(time => time > windowStart);
      if (recentRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, recentRequests);
      }
    }
  }
}

class RateLimiter {
  private limiter: Ratelimit | InMemoryRateLimiter;
  private isUpstash: boolean;

  constructor(maxRequests: number, windowSeconds: number, prefix: string = 'ratelimit') {
    if (!redis || isDevelopment) {
      // Use in-memory limiter for development or when Redis isn't configured
      console.log(`[RateLimiter:${prefix}] Using in-memory rate limiter (${maxRequests} requests per ${windowSeconds}s)`);
      this.limiter = new InMemoryRateLimiter(maxRequests, windowSeconds * 1000);
      this.isUpstash = false;
    } else {
      // Use Upstash in production
      console.log(`[RateLimiter:${prefix}] Using Upstash rate limiter`);
      this.limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(maxRequests, `${windowSeconds}s`),
        prefix,
        analytics: true,
      });
      this.isUpstash = true;
    }
  }

  async check(req: NextRequest): Promise<void> {
    const identifier = getClientIP(req);
    
    try {
      const result = await this.limiter.limit(identifier);
      
      if (!result.success) {
        const error = new Error('Rate limit exceeded') as Error & { code: string };
        error.code = 'RATE_LIMIT_EXCEEDED';
        throw error;
      }
    } catch (error) {
      // If it's our rate limit error, re-throw it
      if ((error as any).code === 'RATE_LIMIT_EXCEEDED') {
        throw error;
      }
      
      // Log other errors but don't block the request in development
      console.error('[RateLimiter] Error checking rate limit:', error);
      if (!isDevelopment) {
        throw error;
      }
    }
  }
}

// Configure rate limits based on environment
const loginLimits = isDevelopment 
  ? { max: 100, window: 60 }  // 100 requests per minute in dev
  : { max: 5, window: 300 };  // 5 requests per 5 minutes in prod

const registrationLimits = isDevelopment
  ? { max: 50, window: 60 }
  : { max: 3, window: 3600 };

const inviteLimits = isDevelopment
  ? { max: 50, window: 60 }
  : { max: 10, window: 3600 };

const passwordResetLimits = isDevelopment
  ? { max: 50, window: 60 }
  : { max: 3, window: 3600 };

const logoutLimits = isDevelopment
  ? { max: 100, window: 60 }
  : { max: 10, window: 60 };

// Export rate limiters
export const loginRateLimit = new RateLimiter(loginLimits.max, loginLimits.window, 'login');
export const registrationRateLimit = new RateLimiter(registrationLimits.max, registrationLimits.window, 'registration');
export const inviteManagerRateLimit = new RateLimiter(inviteLimits.max, inviteLimits.window, 'invite');
export const passwordResetRateLimit = new RateLimiter(passwordResetLimits.max, passwordResetLimits.window, 'password-reset');
export const logoutRateLimit = new RateLimiter(logoutLimits.max, logoutLimits.window, 'logout');
