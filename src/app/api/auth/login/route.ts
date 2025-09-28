import { NextResponse, type NextRequest } from 'next/server';
import { isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { authConfig } from '@/config/server-config';
import { createSession } from '@/lib/auth-service';
import { z } from 'zod';
import { loginRateLimit } from '@/lib/rate-limiter';
import { createRequestContext } from '@/lib/auth-utils';

export const runtime = 'nodejs';

// Validation schema for ID token
const loginRequestSchema = z.object({
  idToken: z.string().min(1, 'ID token is required')
});

// Standardized error response interface
interface ApiError {
  error: string;
  code?: string;
  timestamp: string;
  requestId?: string;
}

// Security headers for all auth responses
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
  
  if (!isFirebaseAdminInitialized) {
    console.error(`[ERROR: /api/auth/login][${requestId}] Firebase Admin not initialized`, { context: requestContext });
    return createErrorResponse(
      'Authentication service temporarily unavailable. Please try again later.',
      503,
      'SERVICE_UNAVAILABLE',
      requestId
    );
  }

  try {
    // The check method in the new rate limiter will throw an error on its own if the limit is exceeded.
    await loginRateLimit.check(req);
  } catch (error: unknown) {
     console.warn(`[SECURITY: /api/auth/login][${requestId}] Rate limit exceeded for IP`, { context: requestContext });
     return createErrorResponse(
        'Too many login attempts. Please try again later.',
        429,
        'RATE_LIMIT_EXCEEDED',
        requestId
      );
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn(`[WARN: /api/auth/login][${requestId}] Missing or invalid Authorization header`, { context: requestContext });
      return createErrorResponse('Invalid authentication format', 401, 'INVALID_AUTH_HEADER', requestId);
    }

    const idToken = authHeader.split('Bearer ')[1];
    if (!idToken) {
      console.warn(`[WARN: /api/auth/login][${requestId}] Empty ID token`, { context: requestContext });
      return createErrorResponse('Invalid authentication token', 401, 'EMPTY_TOKEN', requestId);
    }

    const validation = loginRequestSchema.safeParse({ idToken });
    if (!validation.success) {
      console.warn(`[WARN: /api/auth/login][${requestId}] Token validation failed`, { issues: validation.error.issues, context: requestContext });
      return createErrorResponse('Invalid token format', 400, 'INVALID_TOKEN_FORMAT', requestId);
    }

    console.info(`[INFO: /api/auth/login][${requestId}] Attempting to create session`, { context: requestContext });
    const { sessionCookie, userProfile } = await createSession(idToken);

    const response = NextResponse.json(userProfile, { status: 200 });
    
    response.cookies.set(authConfig.cookieName, sessionCookie, {
      ...authConfig.cookieSerializeOptions,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production'
    });

    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    console.info(`[INFO: /api/auth/login][${requestId}] Login successful for user: ${userProfile.uid}`, { context: requestContext });
    return response;

  } catch (error: unknown) {
    const typedError = error as { message?: string, code?: string };
    console.error(`[ERROR: /api/auth/login][${requestId}]`, { message: typedError.message, code: typedError.code, context: requestContext });

    if (typedError.code === 'INCOMPLETE_PROFILE') {
      return createErrorResponse(typedError.message || 'Profile is incomplete.', 403, 'INCOMPLETE_PROFILE', requestId);
    }

    if (typedError.code?.startsWith('auth/')) {
      let message = 'Invalid credentials. Please try again.';
      let code = 'INVALID_CREDENTIALS';

      switch (typedError.code) {
        case 'auth/invalid-id-token':
        case 'auth/id-token-expired':
          message = 'Your session has expired. Please sign in again.';
          code = 'TOKEN_EXPIRED';
          break;
        case 'auth/id-token-revoked':
          message = 'Your session has been revoked. Please sign in again.';
          code = 'TOKEN_REVOKED';
          break;
        case 'auth/user-disabled':
          message = 'This account has been disabled. Please contact support.';
          code = 'ACCOUNT_DISABLED';
          break;
      }
      return createErrorResponse(message, 401, code, requestId);
    }

    return createErrorResponse('An unexpected error occurred during login. Please try again.', 500, 'INTERNAL_ERROR', requestId);
  }
}
