

import { NextResponse, type NextRequest } from 'next/server';
import { isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { authConfig } from '@/config/server-config';
import { createSession } from '@/lib/auth-service';

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
    // response.cookies.set(authConfig.cookieName, sessionCookie, authConfig.cookieSerializeOptions);

    return response;
  } catch (error: any) {
    console.error('[ERROR: /api/auth/login]', error);
    
    // If the error indicates an incomplete profile, we need a special error code
    // so the client knows to redirect to onboarding instead of just showing a generic error.
    if (error.code === 'INCOMPLETE_PROFILE') {
      return NextResponse.json({
        error: error.message,
        errorCode: 'INCOMPLETE_PROFILE' // Send a specific code for the client to handle
      }, { status: 403 }); // 403 Forbidden is more appropriate here
    }
    
    return NextResponse.json({ error: error.message || 'Invalid credentials. Please try again.' }, { status: 401 });
  }
}
