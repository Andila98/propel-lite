
import { NextResponse, type NextRequest } from 'next/server';
import { isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { authConfig } from '@/config/server-config';
import { createSession } from '@/lib/auth-service';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase-client';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!isFirebaseAdminInitialized) {
    return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 500 });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token format' }, { status: 401 });
    }
    
    const { sessionCookie, userProfile } = await createSession(idToken);
    
    const response = NextResponse.json(userProfile, { status: 200 });
    response.cookies.set(authConfig.cookieName, sessionCookie, authConfig.cookieSerializeOptions);

    return response;
  } catch (error: any) {
    console.error('[ERROR: /api/auth/login]', error);
    
    // If the error indicates an incomplete profile, we need a special error code
    // so the client knows not to just show "Invalid Credentials".
    if (error.message.includes('account setup is not complete')) {
      return NextResponse.json({
        error: error.message,
        errorCode: 'INCOMPLETE_PROFILE'
      }, { status: 403 });
    }
    
    return NextResponse.json({ error: error.message || 'Invalid credentials. Please try again.' }, { status: 401 });
  }
}
