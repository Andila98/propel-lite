
import { type NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { admin, db } from '@/lib/firebase-admin';
import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().email('Invalid email format'),
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name too long'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const validationResult = signupSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    
    const { email, displayName, password } = validationResult.data;

    const userRecord = await getAuth().createUser({
      email,
      password,
      displayName,
      emailVerified: false, // Start as unverified
    });

    await getAuth().setCustomUserClaims(userRecord.uid, {
      role: 'landlord', // Default role for signup
    });

    const userRef = db.collection('users').doc(userRecord.uid);
    await userRef.set({
      uid: userRecord.uid,
      email,
      name: displayName,
      role: 'landlord',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true,
      profileComplete: false,
    });

    // Optional: Send verification email
    // const verificationLink = await getAuth().generateEmailVerificationLink(email);
    // await sendVerificationEmail(email, verificationLink);
    
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
          { error: 'Signup failed. Please try again later.' },
          { status: 500 }
        );
    }
  }
}
