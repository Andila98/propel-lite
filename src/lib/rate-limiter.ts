import { NextRequest } from 'next/server';

interface RateLimiterOptions {
  windowMs: number;
  max: number;
  keyGenerator: (req: NextRequest) => string;
}

interface RequestLog {
  timestamp: number;
  count: number;
}

const requestStore = new Map<string, RequestLog>();

export default function rateLimit({ windowMs, max, keyGenerator }: RateLimiterOptions) {
  return async function (req: NextRequest): Promise<void> {
    const key = keyGenerator(req);
    const now = Date.now();
    const log = requestStore.get(key);

    if (log && (now - log.timestamp < windowMs)) {
      // Within the window, increment count
      if (log.count >= max) {
        // Limit exceeded
        throw new Error('Rate limit exceeded');
      }
      log.count += 1;
      log.timestamp = now; // Update timestamp to the latest request
    } else {
      // Not in store or window expired, reset
      requestStore.set(key, { timestamp: now, count: 1 });
    }

    // Clean up old entries periodically (optional, but good practice)
    if (Math.random() < 0.1) { // 10% chance to clean up
        const cutoff = now - windowMs;
        requestStore.forEach((value, key, map) => {
            if (value.timestamp < cutoff) {
                map.delete(key);
            }
        });
    }
  };
}
