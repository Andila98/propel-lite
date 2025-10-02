
import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";
import { getClientIP } from "./auth-utils";
import type { NextRequest } from "next/server";

// Common rate limiter factory
function createRateLimiter(
    requests: number,
    per: "s" | "m" | "h" | "d",
    prefix: string
) {
    const ratelimit = new Ratelimit({
        redis: kv,
        limiter: Ratelimit.slidingWindow(requests, `${requests} ${per}`),
        analytics: true,
        prefix: `ratelimit_${prefix}`,
    });

    return {
        check: async (request: NextRequest) => {
            const ip = getClientIP(request) || "127.0.0.1";
            const { success, limit, remaining, reset } = await ratelimit.limit(ip);
            
            if (!success) {
                const error = new Error("Rate limit exceeded") as Error & {
                    code: string;
                    limit: number;
                    remaining: number;
                    reset: number;
                };
                error.code = 'RATE_LIMIT_EXCEEDED';
                error.limit = limit;
                error.remaining = remaining;
                error.reset = reset;
                throw error;
            }

            return { limit, remaining, reset };
        }
    };
}

// Specific rate limiters for different actions
export const loginRateLimit = createRateLimiter(10, "m", "login");
export const registrationRateLimit = createRateLimiter(5, "h", "register");
export const passwordResetRateLimit = createRateLimiter(5, "h", "password_reset");
export const inviteManagerRateLimit = createRateLimiter(10, "h", "invite_manager");
export const logoutRateLimit = createRateLimiter(20, "m", "logout");
