
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
    
    // Check if the user's profile is complete before creating a session.
    if (userProfile.role !== 'tenant' && !userProfile.profileComplete) {
        return NextResponse.json({ 
            error: 'Your account setup is not complete. Please finish the onboarding process.',
            errorCode: 'INCOMPLETE_PROFILE' 
        }, { status: 403 });
    }

    const response = NextResponse.json(userProfile, { status: 200 });
    response.cookies.set(authConfig.cookieName, sessionCookie, authConfig.cookieSerializeOptions);

    return response;
  } catch (error: any) {
    console.error('[ERROR: /api/auth/login]', error);
    return NextResponse.json({ error: 'Invalid credentials. Please try again.' }, { status: 401 });
  }
}
