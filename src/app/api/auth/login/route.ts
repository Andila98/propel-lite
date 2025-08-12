
import { type NextRequest, NextResponse } from 'next/server';
import { getTokens } from 'next-firebase-auth-edge/lib/next/tokens';
import { getAuth } from 'firebase-admin/auth';
import { authConfig } from '@/config/server-config';
import { db } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    const decodedToken = await getAuth().verifyIdToken(idToken);

    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    let userRole = 'tenant';
    if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData && userData.role) {
            userRole = userData.role;
        }
    }
    
    const tokens = await getTokens(request, {
      ...authConfig,
      apiKey: authConfig.apiKey,
      debug: process.env.NODE_ENV === 'development',
      isTokenValid: (decoded) => decoded.uid === decodedToken.uid,
      idToken,
    });
    
    const response = NextResponse.json({
        success: true,
        role: userRole
    }, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    
    response.cookies.set({
      name: authConfig.cookieName,
      value: tokens?.token,
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: authConfig.cookieSerializeOptions.maxAge,
    });

    return response;

  } catch (error: any) {
    console.error("[LOGIN_ERROR]", error);
    const message = error.message || 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
