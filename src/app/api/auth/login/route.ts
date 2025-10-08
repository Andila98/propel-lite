
// Enhanced /api/auth/login/route.ts with detailed logging

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

  // Skip rate limiting in development
  const isDevelopment = process.env.NODE_ENV === 'development';
  if (!isDevelopment) {
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
  } else {
    console.log(`[INFO: /api/auth/login][${requestId}] Rate limiting disabled in development`);
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

    // DETAILED TOKEN VERIFICATION
    console.log(`[INFO: /api/auth/login][${requestId}] Verifying ID token with Firebase Admin...`);
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
      console.log(`[INFO: /api/auth/login][${requestId}] Token verified ✓ UID: ${decodedToken.uid}`);
      console.log(`[INFO: /api/auth/login][${requestId}] Token claims:`, {
        uid: decodedToken.uid,
        email: decodedToken.email,
        email_verified: decodedToken.email_verified,
        auth_time: decodedToken.auth_time,
        iat: decodedToken.iat,
        exp: decodedToken.exp
      });
    } catch (verifyError: unknown) {
      const err = verifyError as { code?: string; message: string };
      console.error(`[ERROR: /api/auth/login][${requestId}] Token verification failed:`, {
        code: err.code,
        message: err.message
      });
      return createErrorResponse(
        'Invalid or expired token',
        401,
        err.code || 'TOKEN_VERIFICATION_FAILED',
        requestId
      );
    }

    console.log(`[INFO: /api/auth/login][${requestId}] Creating session for UID: ${decodedToken.uid}`);
    
    const { sessionCookie, userProfile } = await createSession(idToken);

    console.log(`[INFO: /api/auth/login][${requestId}] Session created successfully ✓`);
    console.log(`[INFO: /api/auth/login][${requestId}] Session cookie length: ${sessionCookie.length}`);
    console.log(`[INFO: /api/auth/login][${requestId}] User profile:`, {
      uid: userProfile.uid,
      email: userProfile.email,
      role: userProfile.role,
      profileComplete: userProfile.profileComplete
    });

    const response = NextResponse.json(userProfile, { status: 200 });
    
    const cookieOptions = {
      ...authConfig.cookieSerializeOptions,
      sameSite: 'strict' as const,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      httpOnly: true
    };

    console.log(`[INFO: /api/auth/login][${requestId}] Setting cookie:`, {
      name: authConfig.cookieName,
      options: cookieOptions
    });
    
    response.cookies.set(authConfig.cookieName, sessionCookie, cookieOptions);

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
