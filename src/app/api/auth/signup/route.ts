
import { type NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { admin, db } from '@/lib/firebase-admin';
import { z } from 'zod';

export const runtime = 'nodejs';

const signupSchema = z.object({
  idToken: z.string(),
});

/**
 * Handles the final step of the user signup process for landlords.
 * 1. Validates the incoming request body for an ID token.
 * 2. Verifies the ID token to get the newly created user's UID.
 * 3. Sets a custom claim 'role: landlord' for the new user.
 * 4. Creates a corresponding user profile in the Firestore 'users' collection.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // 1. Validate request body
    const validationResult = signupSchema.safeParse(body);
    if (!validationResult.success) {
      console.error("[SIGNUP_VALIDATION_ERROR]", validationResult.error.flatten());
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    
    const { idToken } = validationResult.data;

    // 2. Verify Firebase ID token
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const { uid, email, name } = decodedToken;

    // 3. Set custom role claim
    await getAuth().setCustomUserClaims(uid, {
      role: 'landlord', // Default role for signup
    });

    // 4. Create Firestore user profile
    const userRef = db.collection('users').doc(uid);
    await userRef.set({
      uid,
      email,
      name,
      role: 'landlord',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true,
      profileComplete: false, // Onboarding is required after signup
    });

    console.log(`[SIGNUP_SUCCESS] Landlord account provisioned for email: ${email}, UID: ${uid}`);
    
    return NextResponse.json(
      { message: 'Landlord account provisioned successfully. Please log in.', userId: uid },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('[SIGNUP_ERROR]', {
        message: error.message,
        code: error.code,
        stack: error.stack,
    });
  
    // Check for config issues before checking specific auth errors
    if (!admin.apps.length) {
      return NextResponse.json(
        { error: 'Firebase Admin SDK not configured. Cannot process signup.' },
        { status: 503 } // Service Unavailable
      );
    }

    // Handle specific Firebase Auth errors from token verification
    switch (error.code) {
      case 'auth/id-token-expired':
        return NextResponse.json({ error: 'The provided token has expired.' }, { status: 401 });
      case 'auth/invalid-id-token':
        return NextResponse.json({ error: 'The provided ID token is invalid.' }, { status: 401 });
      default:
        return NextResponse.json(
          { error: 'An internal server error occurred during signup provisioning.' },
          { status: 500 }
        );
    }
  }
}
