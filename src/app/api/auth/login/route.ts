
import { type NextRequest, NextResponse } from 'next/server';
import { getTokens } from 'next-firebase-auth-edge/lib/next/tokens';
import { getAuth } from 'firebase-admin/auth';
import { authConfig } from '@/config/server-config';
import { db } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken } = body;

    // 1. Enhanced Input Validation
    if (!idToken || typeof idToken !== 'string' || idToken.trim().length === 0) {
      return NextResponse.json(
        { error: 'Valid ID token is required' },
        { status: 400 }
      );
    }

    const decodedToken = await getAuth().verifyIdToken(idToken);

    // Fetch user from Firestore to get the role from a reliable source
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    let userRole = 'tenant'; // Default role
    if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData && userData.role) {
            userRole = userData.role;
        }
    }
    
    // The library expects the raw request object, not just the body.
    const tokens = await getTokens(request, {
      ...authConfig,
      idToken,
    });
    
    // Log successful login for monitoring
    const clientIP = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
    console.log('[LOGIN_SUCCESS]', {
        uid: decodedToken.uid,
        email: decodedToken.email,
        role: userRole,
        timestamp: new Date().toISOString(),
        ip: clientIP,
    });

    // 3. Enhanced Response
    const response = NextResponse.json({
        success: true,
        role: userRole
    }, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    
    response.cookies.set({
      name: authConfig.cookieName,
      value: tokens.token,
      httpOnly: true,
      path: '/',
      secure: authConfig.cookieSerializeOptions.secure,
      sameSite: authConfig.cookieSerializeOptions.sameSite,
      maxAge: authConfig.cookieSerializeOptions.maxAge,
    });

    return response;

  } catch (error: any) {
    // 2. More Comprehensive Error Handling
    console.error("[LOGIN_ERROR]", {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    if (error.code) {
        switch (error.code) {
        case 'auth/id-token-expired':
            return NextResponse.json({ error: 'Token expired. Please login again.' }, { status: 401 });
        case 'auth/id-token-revoked':
            return NextResponse.json({ error: 'Access revoked. Please login again.' }, { status: 401 });
        case 'auth/invalid-id-token':
            return NextResponse.json({ error: 'Invalid authentication token.' }, { status: 401 });
        case 'auth/user-disabled':
            return NextResponse.json({ error: 'This account has been disabled.' }, { status: 403 });
        case 'auth/user-not-found':
             return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        default:
            return NextResponse.json({ error: 'Authentication failed. Please try again.' }, { status: 401 });
        }
    }

    const message = error.message || 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
