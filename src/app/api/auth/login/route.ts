
import { NextResponse, type NextRequest } from 'next/server';
import { auth, firestore } from '@/lib/firebase-admin';
import { authConfig } from '@/config/server-config';
import type { User } from '@/hooks/use-auth';

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
    
    // 1. Verify the ID token with Firebase Auth
    const decodedToken = await auth.verifyIdToken(idToken);
    const userRecord = await auth.getUser(decodedToken.uid);

    // 2. Get the primary role from custom claims
    const userRole = userRecord.customClaims?.role || 'landlord'; // Default to landlord if no role set

    // 3. Fetch supplemental profile data from Firestore based on the role
    let firestoreProfile: any = {};
    if (userRole === 'manager') {
      const managerDoc = await firestore.collection('managers').doc(userRecord.uid).get();
      if (managerDoc.exists) firestoreProfile = managerDoc.data();
    } else if (userRole === 'tenant') {
      const tenantDoc = await firestore.collection('tenants').doc(userRecord.uid).get();
      if (tenantDoc.exists) firestoreProfile = tenantDoc.data();
    }
    
    // 4. Combine Auth and Firestore data into a complete user profile
    const userProfile: User = {
        uid: userRecord.uid,
        email: userRecord.email || '',
        name: userRecord.displayName || firestoreProfile.name || 'Unnamed User',
        role: userRole,
        profileComplete: userRecord.customClaims?.profileComplete ?? false,
        avatarUrl: userRecord.photoURL,
        permissions: firestoreProfile.permissions || {},
        ...firestoreProfile // Spread the rest of the Firestore data
    };

    // 5. Generate a session cookie with the complete profile
    const expiresIn = authConfig.cookieSerializeOptions.maxAge * 1000;
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });
    
    const response = NextResponse.json(userProfile, { status: 200 });
    response.cookies.set(authConfig.cookieName, sessionCookie, authConfig.cookieSerializeOptions);

    return response;
  } catch (error: any) {
    console.error('[AUTH_LOGIN_ERROR]', error);
    return NextResponse.json({ error: 'Unauthorized: ' + error.message }, { status: 401 });
  }
}
