
import { type NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { admin, firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { z } from 'zod';

export const runtime = 'nodejs';

// Stricter schema for the decoded token to ensure `name` and `email` are present.
const DecodedTokenSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  name: z.string().min(1, { message: "Display name cannot be empty." }),
});

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
  if (!isFirebaseAdminInitialized) {
    return NextResponse.json({ error: 'Firebase not configured.' }, { status: 500 });
  }
  
  try {
    const body = await req.json();
    
    const validationResult = signupSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    
    const { idToken } = validationResult.data;

    const decodedTokenPayload = await getAuth().verifyIdToken(idToken);
    
    // Validate the structure of the decoded token itself.
    const tokenValidation = DecodedTokenSchema.safeParse(decodedTokenPayload);
    if (!tokenValidation.success) {
        return NextResponse.json(
            { error: 'Invalid token payload', details: tokenValidation.error.flatten().fieldErrors },
            { status: 400 }
        );
    }
    const { uid, email, name } = tokenValidation.data;

    await getAuth().setCustomUserClaims(uid, {
      role: 'landlord', // Default role for signup
    });

    const userRef = firestore.collection('users').doc(uid);
    await userRef.set({
      uid,
      email,
      name,
      role: 'landlord',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true,
      profileComplete: false,
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
    });
  
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
