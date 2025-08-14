
import { type NextRequest, NextResponse } from 'next/server';
import { getTokens } from 'next-firebase-auth-edge';
import { authConfig } from '@/config/server-config';
import { admin, db } from '@/lib/firebase-admin';
import { z } from 'zod';

// Define a schema for the user data in Firestore to ensure data integrity.
const UserSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['landlord', 'tenant', 'admin']),
  createdAt: z.any(), // Firestore timestamps are complex to validate simply
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
    const { idToken } = await request.json();
    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json({ error: 'Valid ID token is required.' }, { status: 400 });
    }

    // 1. Verify the Firebase ID token
    const decodedIdToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email } = decodedIdToken;
    console.log(`[API_LOGIN_ATTEMPT] UID: ${uid}, Email: ${email}`);

    // 2. Fetch user data from Firestore
    const userDocRef = db.collection('users').doc(uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      console.error(`[API_LOGIN_ERROR] Firestore user document not found for UID: ${uid}`);
      return NextResponse.json({ error: 'User data not found in Firestore. Please contact support.' }, { status: 404 });
    }
    
    // 3. Validate user data against schema
    const validationResult = UserSchema.safeParse(userDoc.data());

    if (!validationResult.success) {
      console.error(`[API_LOGIN_SCHEMA_MISMATCH] UID: ${uid}`, validationResult.error.flatten());
      return NextResponse.json({ error: 'User data is malformed. Please contact support.' }, { status: 500 });
    }

    const { role, profileComplete } = validationResult.data;
    
    // 4. Generate session cookies
    const tokens = await getTokens(request, { ...authConfig, idToken });
    const response = NextResponse.json({ success: true, role, profileComplete }, { status: 200 });
    response.cookies.set(authConfig.cookieName, tokens.cookie, authConfig.cookieSerializeOptions);

    console.log(`[API_LOGIN_SUCCESS] UID: ${uid}, Role: ${role}, Profile Complete: ${profileComplete}`);
    return response;

  } catch (error: any) {
    // Centralized error handling for the API route
    if (error.message.includes('Failed to parse private key') || error.message.includes('Missing or empty environment variable')) {
      console.error('[API_LOGIN_FATAL] Firebase Admin SDK configuration error:', error.message);
      return NextResponse.json({ error: 'Firebase Admin SDK not configured. Please check server environment variables.' }, { status: 500 });
    }

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
