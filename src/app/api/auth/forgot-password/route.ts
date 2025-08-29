
import { NextResponse, type NextRequest } from 'next/server';
import { auth, isFirebaseAdminInitialized } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    if (!isFirebaseAdminInitialized) {
      return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 500 });
    }
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    await auth.generatePasswordResetLink(email);
    
    // For security reasons, we send a generic success message
    // whether the email exists or not.
    return NextResponse.json({ message: 'If a user with that email exists, a password reset link has been sent.' }, { status: 200 });
  } catch (error: any) {
    console.error('[ERROR: /api/auth/forgot-password]', error);
    // Don't expose specific error messages to the client
    return NextResponse.json({ message: 'If a user with that email exists, a password reset link has been sent.' }, { status: 200 });
  }
}
