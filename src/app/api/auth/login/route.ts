
import { type NextRequest, NextResponse } from 'next/server';
import { authConfig } from '@/config/server-config';
import { firestore, auth } from '@/lib/firebase-admin';
import { z } from 'zod';
import type { DecodedIdToken } from 'firebase-admin/auth';

export const runtime = 'nodejs';

// Define a strict schema for the user data in Firestore.
// This ensures data integrity and prevents crashes from malformed documents.
const UserSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['landlord', 'tenant', 'admin', 'manager']),
  createdAt: z.any(), // Can be Firestore Timestamp or Date
  isActive: z.boolean(),
  profileComplete: z.boolean(),
});

/**
 * Handles the user login process.
 * 1. Receives and validates the Firebase ID token from the client.
 * 2. Verifies the token with the Firebase Admin SDK.
 * 3. Fetches the user's profile from Firestore and validates its schema.
 * 4. Generates a secure session cookie.
 * 5. Returns the user's role and profile status to the client for redirection.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json({ error: 'Valid ID token is required.' }, { status: 400 });
    }

    // 2. Verify the Firebase ID token
    const decodedIdToken: DecodedIdToken = await auth.verifyIdToken(idToken);
    const { uid, email } = decodedIdToken;
    
    // 3. Fetch user data from Firestore
    const userDocRef = firestore.collection('users').doc(uid);
    const userDoc = await userDocRef.get();

    // CRITICAL: Enforce that user must have a Firestore record to log in.
    if (!userDoc.exists) {
      console.error(`[API_LOGIN_ERROR] Firestore user document not found for UID: ${uid}. A user should only be created via signup or invite.`);
      return NextResponse.json({ error: 'User data not found in our system. Please sign up or contact support.' }, { status: 404 });
    }
    
    // 4. Validate user data against schema to prevent crashes from malformed data
    const validationResult = UserSchema.safeParse(userDoc.data());

    if (!validationResult.success) {
      console.error(`[API_LOGIN_SCHEMA_MISMATCH] UID: ${uid}`, validationResult.error.flatten());
      // This is a critical server-side data integrity issue.
      return NextResponse.json({ error: 'User data is malformed. Please contact support.' }, { status: 500 });
    }

    const { role, profileComplete } = validationResult.data;
    
    // 5. Generate session cookie
    const response = NextResponse.json({ success: true, role, profileComplete }, { status: 200 });

    const expiresIn = authConfig.cookieSerializeOptions.maxAge! * 1000;
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });

    response.cookies.set(
        authConfig.cookieName,
        sessionCookie,
        authConfig.cookieSerializeOptions
    );

    return response;

  } catch (error: any) {
    console.error('[API_LOGIN_FAILURE]', {
      message: error.message,
      code: error.code,
    });

    const errorMap: { [key: string]: { message: string, status: number } } = {
        'auth/id-token-expired': { message: 'Token expired. Please login again.', status: 401 },
        'auth/id-token-revoked': { message: 'Access revoked. Please login again.', status: 401 },
        'auth/invalid-id-token': { message: 'Invalid authentication token.', status: 401 },
        'auth/user-disabled': { message: 'This account has been disabled.', status: 403 },
        'auth/user-not-found': { message: 'User not found.', status: 404 },
    };

    const err = errorMap[error.code] || { message: 'An internal server error occurred.', status: 500 };
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
}
