import { NextResponse, type NextRequest } from 'next/server';
import { authConfig } from '@/config/server-config';
import { logoutRateLimit } from '@/lib/rate-limiter';
import { createRequestContext } from '@/lib/auth-utils';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const requestContext = createRequestContext(req);
  
  console.log(`[INFO: /api/auth/logout][${requestId}] ========== LOGOUT REQUEST START ==========`, requestContext);
  
  try {
    await logoutRateLimit.check(req);
  } catch {
    console.warn(`[SECURITY: /api/auth/logout][${requestId}] Rate limit exceeded`);
    // Even if rate limited, proceed to clear cookie to ensure logout state
  }
  
  const response = NextResponse.json({ success: true }, { status: 200 });

  // Clear the session cookie
  response.cookies.set({
    name: authConfig.cookieName,
    value: '',
    ...authConfig.cookieSerializeOptions,
    maxAge: -1, // Expire the cookie immediately
  });

  console.log(`[INFO: /api/auth/logout][${requestId}] Session cookie cleared. ========== LOGOUT SUCCESS ==========`);

  return response;
}
