import { NextResponse, type NextRequest } from 'next/server';
import { isFirebaseAdminInitialized, auth as adminAuth, firestore } from '@/lib/firebase-admin';
import { registrationRateLimit } from '@/lib/rate-limiter';
import { z } from 'zod';
import { createRequestContext } from '@/lib/auth-utils';
import type { User } from '@/lib/types';

export const runtime = 'nodejs';

const signupRequestSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2, "Name must be at least 2 characters"),
});

function createErrorResponse(error: string, status: number, code?: string, requestId?: string) {
  return NextResponse.json({ error, code, timestamp: new Date().toISOString(), requestId }, { status });
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const requestContext = createRequestContext(req);
  
  console.log(`[INFO: /api/auth/signup][${requestId}] ========== SIGNUP REQUEST START ==========`, requestContext);
  
  if (!isFirebaseAdminInitialized) {
    console.error(`[ERROR: /api/auth/signup][${requestId}] Firebase Admin not initialized`);
    return createErrorResponse('Service not configured', 503, 'SERVICE_UNAVAILABLE', requestId);
  }

  try {
    await registrationRateLimit.check(req);
  } catch {
    console.warn(`[SECURITY: /api/auth/signup][${requestId}] Rate limit exceeded`);
    return createErrorResponse('Too many accounts created from this IP', 429, 'RATE_LIMIT_EXCEEDED', requestId);
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createErrorResponse('Unauthorized: Invalid token format', 401, 'INVALID_AUTH_HEADER', requestId);
    }
    const idToken = authHeader.split('Bearer ')[1];

    console.log(`[INFO: /api/auth/signup][${requestId}] Verifying ID token...`);
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    console.log(`[INFO: /api/auth/signup][${requestId}] Token verified for UID: ${decodedToken.uid}`);

    const body = await req.json();
    const validation = signupRequestSchema.safeParse(body);

    if (!validation.success) {
      console.warn(`[WARN: /api/auth/signup][${requestId}] Invalid request body`, validation.error.issues);
      return createErrorResponse('Invalid signup data', 400, 'INVALID_INPUT', requestId);
    }

    const { name, email } = validation.data;
    const { uid } = decodedToken;

    // Check for existing landlord record
    const landlordRef = firestore.collection('landlords').doc(uid);
    const landlordSnap = await landlordRef.get();

    if (landlordSnap.exists) {
      console.warn(`[WARN: /api/auth/signup][${requestId}] Landlord already exists: ${uid}`);
      return createErrorResponse('Account already exists.', 409, 'ACCOUNT_EXISTS', requestId);
    }

    // Update Firebase Auth user profile
    await adminAuth.updateUser(uid, {
      displayName: name,
      emailVerified: true // Or based on your flow
    });

    // Create landlord document in Firestore
    const landlordData: Partial<User> = {
      uid,
      name,
      email,
      role: 'landlord',
      profileComplete: false, // Onboarding starts now
      createdAt: new Date() as any, // Will be converted by Firestore
    };
    await landlordRef.set(landlordData);

    await adminAuth.setCustomUserClaims(uid, { role: 'landlord', profileComplete: false });

    console.log(`[INFO: /api/auth/signup][${requestId}] Landlord profile created for UID: ${uid}`);
    console.log(`[INFO: /api/auth/signup][${requestId}] ========== SIGNUP SUCCESS ==========`);

    return NextResponse.json({ uid, name, email, role: 'landlord' }, { status: 201 });

  } catch (error: unknown) {
    const typedError = error as { code?: string, message: string };
    console.error(`[ERROR: /api/auth/signup][${requestId}]`, typedError);
    
    if (typedError.code === 'auth/id-token-expired') {
        return createErrorResponse('Your session has expired. Please try signing up again.', 401, 'TOKEN_EXPIRED', requestId);
    }

    return createErrorResponse('An unexpected error occurred during signup.', 500, 'INTERNAL_ERROR', requestId);
  }
}
