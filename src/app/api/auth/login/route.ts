
import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import { authConfig } from '@/config/server-config';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token format' }, { status: 401 });
    }
    
    const decodedToken = await auth.verifyIdToken(idToken);

    // Generate a session cookie.
    // The session cookie will have the same claims as the ID token.
    const expiresIn = authConfig.cookieSerializeOptions.maxAge * 1000;
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });
    
    const userRecord = await auth.getUser(decodedToken.uid);
    const userProfile = {
        uid: userRecord.uid,
        email: userRecord.email!,
        name: userRecord.displayName || 'Unnamed User',
        role: userRecord.customClaims?.role || 'tenant',
        profileComplete: userRecord.customClaims?.profileComplete || false,
        avatarUrl: userRecord.photoURL,
        permissions: userRecord.customClaims?.permissions || {},
    };

    const response = NextResponse.json(userProfile, { status: 200 });
    response.cookies.set(authConfig.cookieName, sessionCookie, authConfig.cookieSerializeOptions);

    return response;
  } catch (error: any) {
    console.error('[AUTH_LOGIN_ERROR]', error);
    return NextResponse.json({ error: 'Unauthorized: ' + error.message }, { status: 401 });
  }
}
