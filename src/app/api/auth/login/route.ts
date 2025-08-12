
import { type NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { authConfig } from '@/config/server-config';
import { createAuthCookies } from 'next-firebase-auth-edge/lib/next/cookies';
import { db } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    const decodedToken = await getAuth().verifyIdToken(idToken);

    // Fetch user from Firestore to get the most up-to-date role
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    let userRole = 'tenant'; // Default role
    if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData && userData.role) {
            userRole = userData.role;
        }
    }
    
    // Create a new decoded token with the updated role for the cookie
    const tokenWithRole = { ...decodedToken, role: userRole };

    const cookies = await createAuthCookies(tokenWithRole, {
      ...authConfig,
    });
    
    const response = NextResponse.json({
        success: true,
        role: userRole
    }, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    
    cookies.forEach((cookie) => {
        response.cookies.set(cookie.name, cookie.value, cookie);
    });

    return response;

  } catch (error: any) {
    console.error("[LOGIN_ERROR]", error);
    const message = error.message || 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
