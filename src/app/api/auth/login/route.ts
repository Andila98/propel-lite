
import { type NextRequest, NextResponse } from 'next/server';
import { authConfig } from '@/config/server-config';
import { isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { authService } from '@/services/auth-service';

/**
 * Handles the user login process.
 * 1. Receives and validates the Firebase ID token from the client.
 * 2. Delegates to AuthService to verify the token and fetch user data.
 * 3. Delegates to AuthService to create a session cookie.
 * 4. Returns the user's role and profile status to the client for redirection.
 */
export async function POST(request: NextRequest) {
  if (!isFirebaseAdminInitialized) {
    return NextResponse.json({ error: 'Firebase not configured.' }, { status: 500 });
  }
  
  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json({ error: 'Valid ID token is required.' }, { status: 400 });
    }

    // 2. Verify token and fetch user data via AuthService
    const { user } = await authService.verifyAndFetchUser(idToken);
    
    const { role, profileComplete } = user;
    
    // 3. Create session cookie via AuthService
    const sessionCookie = await authService.createSession(idToken);
    
    const response = NextResponse.json({ success: true, role, profileComplete }, { status: 200 });

    response.cookies.set(
        authConfig.cookieName,
        sessionCookie,
        authConfig.cookieSerializeOptions
    );

    return response;

  } catch (error: any) {
    console.error('[API_LOGIN_FAILURE]', {
      message: error.message,
      code: error.code,
    });

    const errorMap: { [key: string]: { message: string, status: number } } = {
        'auth/id-token-expired': { message: 'Token expired. Please login again.', status: 401 },
        'auth/id-token-revoked': { message: 'Access revoked. Please login again.', status: 401 },
        'auth/invalid-id-token': { message: 'Invalid authentication token.', status: 401 },
        'auth/user-disabled': { message: 'This account has been disabled.', status: 403 },
    };

    const err = errorMap[error.code] || { message: error.message || 'An internal server error occurred.', status: 500 };
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
}
