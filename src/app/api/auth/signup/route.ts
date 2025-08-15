
import { type NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { admin, db } from '@/lib/firebase-admin';
import { z } from 'zod';

export const runtime = 'nodejs';

const signupSchema = z.object({
  email: z.string().email('Invalid email format'),
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name too long'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

/**
 * Handles the user signup process for landlords.
 * 1. Validates the incoming request body.
 * 2. Creates a new user in Firebase Authentication.
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
    
    const { email, displayName, password } = validationResult.data;

    // 2. Create Firebase Auth user
    const userRecord = await getAuth().createUser({
      email,
      password,
      displayName,
      emailVerified: false, // Start as unverified
    });

    // 3. Set custom role claim
    await getAuth().setCustomUserClaims(userRecord.uid, {
      role: 'landlord', // Default role for signup
    });

    // 4. Create Firestore user profile
    const userRef = db.collection('users').doc(userRecord.uid);
    await userRef.set({
      uid: userRecord.uid,
      email,
      name: displayName,
      role: 'landlord',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true,
      profileComplete: false, // Onboarding is required after signup
    });

    console.log(`[SIGNUP_SUCCESS] Landlord account created for email: ${email}, UID: ${userRecord.uid}`);
    
    return NextResponse.json(
      { message: 'Landlord account created successfully. Please log in.', userId: userRecord.uid },
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

    // Handle specific Firebase Auth errors
    switch (error.code) {
      case 'auth/email-already-exists':
        return NextResponse.json(
          { error: 'The email address is already in use by another account.' },
          { status: 409 } // Conflict
        );
      case 'auth/invalid-email':
        return NextResponse.json(
          { error: 'Invalid email address format.' },
          { status: 400 }
        );
      case 'auth/weak-password':
        return NextResponse.json(
          { error: 'Password is too weak. Please choose a stronger password.' },
          { status: 400 }
        );
      default:
        return NextResponse.json(
          { error: 'An internal server error occurred during signup.' },
          { status: 500 }
        );
    }
  }
}
