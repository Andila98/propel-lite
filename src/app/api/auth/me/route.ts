
import { type NextRequest, NextResponse } from 'next/server';
import { isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { verifySession } from '@/lib/auth-utils';
import { getUserProfile } from '@/lib/auth-service';
import { toJSON } from '@/lib/utils';
import { authConfig } from '@/config/server-config';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID();
  
  // Log incoming request
  console.log(`[INFO: /api/auth/me][${requestId}] Request received`);

  if (!isFirebaseAdminInitialized) {
    console.error(`[ERROR: /api/auth/me][${requestId}] Firebase Admin not initialized`);
    return NextResponse.json(
      { error: 'Backend services are not configured. Please contact support.' }, 
      { status: 503 }
    );
  }

  let sessionCookie: string | undefined;
  let claims: any;
  let userProfile: any;

  try {
    // Step 1: Get session cookie
    sessionCookie = req.cookies.get(authConfig.cookieName)?.value;
    console.log(`[INFO: /api/auth/me][${requestId}] Session cookie present:`, !!sessionCookie);

    if (!sessionCookie) {
      console.log(`[INFO: /api/auth/me][${requestId}] No session cookie found`);
      return NextResponse.json(
        { error: 'Unauthorized: No session cookie.' }, 
        { status: 401 }
      );
    }

    // Step 2: Verify session
    try {
      claims = await verifySession(sessionCookie);
      console.log(`[INFO: /api/auth/me][${requestId}] Claims verified:`, !!claims);
    } catch (verifyError: unknown) {
      const err = verifyError as Error & { code?: string };
      console.error(`[ERROR: /api/auth/me][${requestId}] Session verification failed:`, {
        message: err.message,
        code: err.code
      });
      
      const response = NextResponse.json(
        { error: 'Unauthorized: Invalid or expired session.' }, 
        { status: 401 }
      );
      response.cookies.delete(authConfig.cookieName);
      return response;
    }
    
    if (!claims) {
      console.log(`[INFO: /api/auth/me][${requestId}] No valid claims found`);
      const response = NextResponse.json(
        { error: 'Unauthorized: Invalid session claims.' }, 
        { status: 401 }
      );
      response.cookies.delete(authConfig.cookieName);
      return response;
    }

    // Step 3: Get user profile
    try {
      console.log(`[INFO: /api/auth/me][${requestId}] Fetching profile for uid:`, claims.uid);
      userProfile = await getUserProfile(claims.uid);
    } catch (profileError: unknown) {
      const err = profileError as Error & { code?: string };
      console.error(`[ERROR: /api/auth/me][${requestId}] getUserProfile failed:`, {
        uid: claims.uid,
        message: err.message,
        code: err.code,
        stack: err.stack
      });
      
      // If profile fetch fails, it might be a database issue
      return NextResponse.json(
        { error: 'Failed to fetch user profile.' }, 
        { status: 500 }
      );
    }
    
    if (!userProfile) {
      console.error(`[ERROR: /api/auth/me][${requestId}] User profile not found for uid:`, claims.uid);
      return NextResponse.json(
        { error: 'User profile not found.' }, 
        { status: 404 }
      );
    }

    // Step 4: Return profile
    console.log(`[INFO: /api/auth/me][${requestId}] Successfully returning profile for uid:`, claims.uid);
    return NextResponse.json(toJSON(userProfile), { status: 200 });
    
  } catch (error: unknown) {
    // Catch-all for any unexpected errors
    const typedError = error as Error & { code?: string };
    console.error(`[ERROR: /api/auth/me][${requestId}] Unexpected error:`, {
      message: typedError.message,
      code: typedError.code,
      stack: typedError.stack,
      sessionCookiePresent: !!sessionCookie,
      claimsPresent: !!claims,
      profilePresent: !!userProfile
    });
    
    return NextResponse.json(
      { 
        error: 'An internal server error occurred.',
        requestId // Include requestId for debugging
      }, 
      { status: 500 }
    );
  }
}
