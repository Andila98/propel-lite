
import { type NextRequest, NextResponse } from 'next/server';
import { getTokens } from 'next-firebase-auth-edge';
import { authConfig } from '@/config/server-config';
import { admin, db } from '@/lib/firebase-admin';

async function handler(request: NextRequest) {
  const clientIP = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
  try {
    const { idToken } = await request.json();
    if (!idToken || typeof idToken !== 'string' || idToken.trim().length === 0) {
      return NextResponse.json({ error: 'Valid ID token is required' }, { status: 400 });
    }
    
    // First, verify the token to get the UID without setting cookies yet.
    const decodedIdToken = await admin.auth().verifyIdToken(idToken);
    const { uid } = decodedIdToken;

    // Then, fetch user data from Firestore to get their role.
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User data not found in Firestore.' }, { status: 404 });
    }
    const role = userDoc.data()?.role;
    if (!role) {
      return NextResponse.json({ error: 'User role not found.' }, { status: 403 });
    }
    
    // Now, generate session cookies with the verified token and role.
    const tokens = await getTokens(request, { ...authConfig, idToken });
    const { token, cookie } = tokens;

    const response = NextResponse.json({ success: true, role }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
      },
    });

    response.cookies.set(authConfig.cookieName, cookie, authConfig.cookieSerializeOptions);

    console.log('[LOGIN_SUCCESS]', {
      uid,
      email: decodedIdToken.email,
      role,
      timestamp: new Date().toISOString(),
      ip: clientIP,
    });
    
    return response;
  } catch (error: any) {
    console.error('[LOGIN_ERROR]', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      ip: clientIP,
    });

    if (error.code) {
      switch (error.code) {
        case 'auth/id-token-expired':
          return NextResponse.json({ error: 'Token expired. Please login again.' }, { status: 401 });
        case 'auth/id-token-revoked':
          return NextResponse.json({ error: 'Access revoked. Please login again.' }, { status: 401 });
        case 'auth/invalid-id-token':
          return NextResponse.json({ error: 'Invalid authentication token.' }, { status: 401 });
        case 'auth/user-disabled':
          return NextResponse.json({ error: 'Account has been disabled.' }, { status: 403 });
        default:
          return NextResponse.json({ error: 'Authentication failed.' }, { status: 401 });
      }
    }
    
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export { handler as POST };
