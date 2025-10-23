
import { NextResponse, type NextRequest } from 'next/server';
import { isFirebaseAdminInitialized, auth as adminAuth } from '@/lib/firebase-admin';
import { passwordResetRateLimit } from '@/lib/rate-limiter';
import { z } from 'zod';
import { createRequestContext } from '@/lib/auth-utils';

export const runtime = 'nodejs';

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
});

function createErrorResponse(error: string, status: number, code?: string, requestId?: string) {
  return NextResponse.json({ error, code, timestamp: new Date().toISOString(), requestId }, { status });
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const requestContext = createRequestContext(req);
  
  console.log(`[INFO: /api/auth/forgot-password][${requestId}] ========== FORGOT PASSWORD REQUEST START ==========`, requestContext);
  
  if (!isFirebaseAdminInitialized) {
    console.error(`[ERROR: /api/auth/forgot-password][${requestId}] Firebase Admin not initialized`);
    return createErrorResponse('Service not configured', 503, 'SERVICE_UNAVAILABLE', requestId);
  }

  try {
    await passwordResetRateLimit.check(req);
  } catch {
    console.warn(`[SECURITY: /api/auth/forgot-password][${requestId}] Rate limit exceeded`);
    return createErrorResponse('Too many password reset attempts.', 429, 'RATE_LIMIT_EXCEEDED', requestId);
  }

  try {
    const body = await req.json();
    const validation = forgotPasswordSchema.safeParse(body);

    if (!validation.success) {
      return createErrorResponse('Invalid email provided.', 400, 'INVALID_INPUT', requestId);
    }
    
    const { email } = validation.data;
    
    // Use the client-side SDK method via the useAuth hook for sending the email.
    // This API route is a placeholder for more complex server-side logic if needed in the future.
    // For now, we confirm the user exists before the client sends the email.
    await adminAuth.getUserByEmail(email);

    console.log(`[INFO: /api/auth/forgot-password][${requestId}] User found for email. Client will now send reset email.`);
    
    return NextResponse.json({ success: true, message: 'If an account exists for this email, a password reset link will be sent.' }, { status: 200 });

  } catch (error: unknown) {
    const typedError = error as { code?: string };
    if (typedError.code === 'auth/user-not-found') {
        // Still return a success message to avoid user enumeration.
        console.log(`[INFO: /api/auth/forgot-password][${requestId}] User not found, but returning success to client.`);
        return NextResponse.json({ success: true, message: 'If an account exists for this email, a password reset link will be sent.' }, { status: 200 });
    }
    
    console.error(`[ERROR: /api/auth/forgot-password][${requestId}]`, error);
    return createErrorResponse('An unexpected error occurred.', 500, 'INTERNAL_ERROR', requestId);
  }
}
