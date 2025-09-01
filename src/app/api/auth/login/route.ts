import { NextResponse, type NextRequest } from 'next/server';
import { isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { authConfig } from '@/config/server-config';
import { createSession } from '@/lib/auth-service';
import { z } from 'zod';
import { loginRateLimit } from '@/lib/rate-limiter';

export const runtime = 'nodejs';

// Validation schema for ID token
const loginRequestSchema = z.object({
  idToken: z.string().min(1, 'ID token is required')
});

// Standardized error response interface
interface ApiErrorResponse {
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
): NextResponse<ApiErrorResponse> {
  const response = NextResponse.json({
    error,
    code,
    timestamp: new Date().toISOString(),
    requestId
  }, { status });

  // Add security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  
  // Check if Firebase Admin is initialized
  if (!isFirebaseAdminInitialized) {
    console.error(`[ERROR: /api/auth/login][${requestId}] Firebase Admin not initialized`);
    return createErrorResponse(
      'Authentication service temporarily unavailable. Please try again later.',
      503,
      'SERVICE_UNAVAILABLE',
      requestId
    );
  }

  // Apply rate limiting
  try {
    await loginRateLimit(req);
  } catch (error) {
    console.warn(`[WARN: /api/auth/login][${requestId}] Rate limit exceeded for IP`);
    return createErrorResponse(
      'Too many login attempts. Please try again later.',
      429,
      'RATE_LIMIT_EXCEEDED',
      requestId
    );
  }

  try {
    // Validate Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn(`[WARN: /api/auth/login][${requestId}] Missing or invalid Authorization header`);
      return createErrorResponse(
        'Invalid authentication format',
        401,
        'INVALID_AUTH_HEADER',
        requestId
      );
    }

    const idToken = authHeader.split('Bearer ')[1];
    if (!idToken) {
      console.warn(`[WARN: /api/auth/login][${requestId}] Empty ID token`);
      return createErrorResponse(
        'Invalid authentication token',
        401,
        'EMPTY_TOKEN',
        requestId
      );
    }

    // Validate token format (basic check)
    const validation = loginRequestSchema.safeParse({ idToken });
    if (!validation.success) {
      console.warn(`[WARN: /api/auth/login][${requestId}] Token validation failed:`, validation.error.issues);
      return createErrorResponse(
        'Invalid token format',
        400,
        'INVALID_TOKEN_FORMAT',
        requestId
      );
    }

    // Create session and get user profile
    console.info(`[INFO: /api/auth/login][${requestId}] Attempting to create session`);
    const { sessionCookie, userProfile } = await createSession(idToken);

    // Create successful response
    const response = NextResponse.json(userProfile, { status: 200 });
    
    // Set session cookie with secure options
    response.cookies.set(authConfig.cookieName, sessionCookie, {
      ...authConfig.cookieSerializeOptions,
      sameSite: 'strict', // Enhanced security
      secure: process.env.NODE_ENV === 'production' // Only secure in production
    });

    // Add security headers
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    console.info(`[INFO: /api/auth/login][${requestId}] Login successful for user: ${userProfile.uid}`);
    return response;

  } catch (error: any) {
    // Log the full error for debugging
    console.error(`[ERROR: /api/auth/login][${requestId}]`, {
      message: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    // Handle specific error cases
    if (error.code === 'INCOMPLETE_PROFILE') {
      return createErrorResponse(
        error.message,
        403,
        'INCOMPLETE_PROFILE',
        requestId
      );
    }

    // Firebase Auth specific errors
    if (error.code?.startsWith('auth/')) {
      let message = 'Invalid credentials. Please try again.';
      let code = 'INVALID_CREDENTIALS';

      switch (error.code) {
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

    // Generic error for unexpected issues
    return createErrorResponse(
      'An unexpected error occurred during login. Please try again.',
      500,
      'INTERNAL_ERROR',
      requestId
    );
  }
}
