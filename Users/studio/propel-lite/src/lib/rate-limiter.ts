
import type { NextRequest } from 'next/server';

const isDevelopment = process.env.NODE_ENV === 'development';
const isDisabled = process.env.DISABLE_RATE_LIMITING === 'true';

// Helper to get client IP
function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return realIP || 'unknown';
}

// Simple in-memory rate limiter
class InMemoryRateLimiter {
  private requests = new Map<string, number[]>();
  
  constructor(
    private maxRequests: number,
    private windowMs: number,
    private name: string
  ) {}

  async check(identifier: string): Promise<{ success: boolean }> {
    // Skip rate limiting if disabled
    if (isDisabled || isDevelopment) {
      return { success: true };
    }

    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Get existing requests for this identifier
    const timestamps = this.requests.get(identifier) || [];
    
    // Filter out old requests
    const recentRequests = timestamps.filter(time => time > windowStart);
    
    // Check if limit exceeded
    if (recentRequests.length >= this.maxRequests) {
      console.warn(`[RateLimiter:${this.name}] Limit exceeded for ${identifier}: ${recentRequests.length}/${this.maxRequests}`);
      return { success: false };
    }
    
    // Add current request
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);
    
    // Cleanup old entries periodically (every 1000 requests)
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
  private limiter: InMemoryRateLimiter;

  constructor(maxRequests: number, windowSeconds: number, name: string = 'ratelimit') {
    this.limiter = new InMemoryRateLimiter(
      maxRequests, 
      windowSeconds * 1000,
      name
    );
    
    if (isDisabled || isDevelopment) {
      console.log(`[RateLimiter:${name}] Rate limiting disabled`);
    } else {
      console.log(`[RateLimiter:${name}] Configured: ${maxRequests} requests per ${windowSeconds}s`);
    }
  }

  async check(req: NextRequest): Promise<void> {
    const identifier = getClientIP(req);
    
    try {
      const result = await this.limiter.check(identifier);
      
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

// Configure rate limits (lenient in development, strict in production)
const loginLimits = isDevelopment || isDisabled
  ? { max: 1000, window: 60 }    // Effectively unlimited in dev
  : { max: 5, window: 300 };      // 5 per 5 minutes in prod

const registrationLimits = isDevelopment || isDisabled
  ? { max: 1000, window: 60 }
  : { max: 3, window: 3600 };

const inviteLimits = isDevelopment || isDisabled
  ? { max: 1000, window: 60 }
  : { max: 10, window: 3600 };

const passwordResetLimits = isDevelopment || isDisabled
  ? { max: 1000, window: 60 }
  : { max: 3, window: 3600 };

const logoutLimits = isDevelopment || isDisabled
  ? { max: 1000, window: 60 }
  : { max: 10, window: 60 };

// Export rate limiters
export const loginRateLimit = new RateLimiter(loginLimits.max, loginLimits.window, 'login');
export const registrationRateLimit = new RateLimiter(registrationLimits.max, registrationLimits.window, 'registration');
export const inviteManagerRateLimit = new RateLimiter(inviteLimits.max, inviteLimits.window, 'invite');
export const passwordResetRateLimit = new RateLimiter(passwordResetLimits.max, passwordResetLimits.window, 'password-reset');
export const logoutRateLimit = new RateLimiter(logoutLimits.max, logoutLimits.window, 'logout');
