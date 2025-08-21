
import { type NextRequest, NextResponse } from 'next/server';
import { auth, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { z } from 'zod';

const ForgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
});

export async function POST(request: NextRequest) {
  if (!isFirebaseAdminInitialized) {
      console.error('[API_FORGOT_PASSWORD] Firebase Admin is not initialized.');
      return NextResponse.json({ error: 'Firebase is not initialized. Please check server credentials.' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const validation = ForgotPasswordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid email provided.' }, { status: 400 });
    }

    const { email } = validation.data;

    // Use Firebase Admin SDK to send a password reset email
    await auth.sendPasswordResetEmail(email);

    return NextResponse.json({ message: 'If an account with this email exists, a password reset link has been sent.' }, { status: 200 });

  } catch (error: any) {
    console.error('[API_FORGOT_PASSWORD_ERROR]', error);
    // We intentionally don't reveal if an email doesn't exist to prevent user enumeration attacks.
    // So, we log the error on the server but return a generic success message to the client.
    // Check for specific, non-revealing errors you might want to handle differently,
    // but for most cases, the generic response is safest.
    if (error.code === 'auth/user-not-found') {
        // Still return a generic success message
        return NextResponse.json({ message: 'If an account with this email exists, a password reset link has been sent.' }, { status: 200 });
    }
    
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
