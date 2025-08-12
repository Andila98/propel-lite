
import { type NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { db, admin } from '@/lib/firebase-admin';
import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().email('Invalid email format'),
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name too long'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.literal('landlord')
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // 1. Enhanced Input Validation
    const validationResult = signupSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    
    const { email, displayName, password, role } = validationResult.data;

    const userRecord = await getAuth().createUser({
      email,
      password,
      displayName,
      emailVerified: false, // 5. Consider adding email verification
    });

    // Use a transaction to ensure both custom claims and user doc creation succeed or fail together.
    try {
        await getAuth().setCustomUserClaims(userRecord.uid, {
          role: 'landlord',
        });

        await db.collection('users').doc(userRecord.uid).set({
          uid: userRecord.uid,
          email,
          name: displayName,
          role: 'landlord',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        return NextResponse.json({ message: 'Landlord account created successfully', userId: userRecord.uid }, { status: 201 });

    } catch (firestoreError: any) {
        // If Firestore/claims operations fail, clean up the created Firebase Auth user for consistency.
        await getAuth().deleteUser(userRecord.uid);
        console.error('[SIGNUP_CLEANUP_ERROR]', firestoreError);
        throw new Error('Failed to set user role and data. User creation has been rolled back.');
    }

  } catch (error: any) {
    // 2. More Comprehensive Error Handling
    console.error('[SIGNUP_ERROR]', error);
    switch (error.code) {
        case 'auth/email-already-exists':
        return NextResponse.json(
            { error: 'The email address is already in use by another account.' },
            { status: 409 }
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
            { error: error.message || 'Signup failed. Please try again later.' },
            { status: 500 }
        );
    }
  }
}
