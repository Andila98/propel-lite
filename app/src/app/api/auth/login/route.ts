import { NextResponse, type NextRequest } from 'next/server';
import { isFirebaseAdminInitialized, auth as adminAuth } from '@/lib/firebase-admin';
import { authConfig } from '@/config/server-config';
import { createSession } from '@/lib/auth-service';
import { z } from 'zod';
import { loginRateLimit } from '@/lib/rate-limiter';
import { createRequestContext } from '@/lib/auth-utils';

export const runtime = 'nodejs';

const loginRequestSchema = z.object({
  idToken: z.string().min(1, 'ID token is required')
});

interface ApiError {
  error: string;
  code?: string;
  timestamp: string;
  requestId?: string;
}

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};

function createErrorResponse(
  error: string, 
  status: number, 
  code?: string, 
  requestId?: string
): NextResponse<ApiError> {
  const response = NextResponse.json({
    error,
    code,
    timestamp: new Date().toISOString(),
    requestId
  }, { status });

  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const requestContext = createRequestContext(req);
  
  console.log(`[INFO: /api/auth/login][${requestId}] ========== LOGIN REQUEST START ==========`);
  console.log(`[INFO: /api/auth/login][${requestId}] Context:`, requestContext);
  
  if (!isFirebaseAdminInitialized) {
    console.error(`[ERROR: /api/auth/login][${requestId}] Firebase Admin not initialized`);
    return createErrorResponse(
      'Authentication service temporarily unavailable. Please try again later.',
      503,
      'SERVICE_UNAVAILABLE',
      requestId
    );
  }

  console.log(`[INFO: /api/auth/login][${requestId}] Firebase Admin is initialized ✓`);

  try {
    await loginRateLimit.check(req);
  } catch {
    console.warn(`[SECURITY: /api/auth/login][${requestId}] Rate limit exceeded`);
    return createErrorResponse(
      'Too many login attempts. Please try again later.',
      429,
      'RATE_LIMIT_EXCEEDED',
      requestId
    );
  }

  try {
    const authHeader = req.headers.get('Authorization');
    console.log(`[INFO: /api/auth/login][${requestId}] Authorization header present:`, !!authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn(`[WARN: /api/auth/login][${requestId}] Missing or invalid Authorization header`);
      return createErrorResponse('Invalid authentication format', 401, 'INVALID_AUTH_HEADER', requestId);
    }

    const idToken = authHeader.split('Bearer ')[1];
    if (!idToken) {
      console.warn(`[WARN: /api/auth/login][${requestId}] Empty ID token`);
      return createErrorResponse('Invalid authentication token', 401, 'EMPTY_TOKEN', requestId);
    }

    console.log(`[INFO: /api/auth/login][${requestId}] ID token received, length: ${idToken.length}`);

    const validation = loginRequestSchema.safeParse({ idToken });
    if (!validation.success) {
      console.warn(`[WARN: /api/auth/login][${requestId}] Token validation failed`, validation.error.issues);
      return createErrorResponse('Invalid token format', 400, 'INVALID_TOKEN_FORMAT', requestId);
    }

    console.log(`[INFO: /api/auth/login][${requestId}] Token validation passed ✓`);

    console.log(`[INFO: /api/auth/login][${requestId}] Verifying ID token with Firebase Admin...`);
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
      console.log(`[INFO: /api/auth/login][${requestId}] Token verified ✓ UID: ${decodedToken.uid}`);
    } catch (verifyError: unknown) {
      const err = verifyError as { code?: string; message: string };
      console.error(`[ERROR: /api/auth/login][${requestId}] Token verification failed:`, {
        code: err.code,
        message: err.message
      });
      return createErrorResponse(
        'Invalid or expired token. Please sign in again.',
        401,
        err.code || 'TOKEN_VERIFICATION_FAILED',
        requestId
      );
    }

    console.log(`[INFO: /api/auth/login][${requestId}] Creating session for UID: ${decodedToken.uid}`);
    
    const { sessionCookie, userProfile } = await createSession(idToken);

    console.log(`[INFO: /api/auth/login][${requestId}] Session created successfully ✓`);
    
    const response = NextResponse.json(userProfile, { status: 200 });
    
    response.cookies.set(authConfig.cookieName, sessionCookie, authConfig.cookieSerializeOptions);

    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    console.log(`[INFO: /api/auth/login][${requestId}] ========== LOGIN SUCCESS ==========`);
    return response;

  } catch (error: unknown) {
    const typedError = error as { message?: string, code?: string };
    console.error(`[ERROR: /api/auth/login][${requestId}] Unexpected error:`, {
      message: typedError.message,
      code: typedError.code,
      stack: (error as Error).stack
    });

    return createErrorResponse('An unexpected error occurred during login. Please try again.', 500, 'INTERNAL_ERROR', requestId);
  }
}
