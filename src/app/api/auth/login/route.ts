
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

    // 2. Fetch the user's profile from Firestore
    let userProfileDoc;
    let userRole = 'tenant'; // Default role
    let firestoreProfile: any = {};
    
    const managerDoc = await firestore.collection('managers').doc(userRecord.uid).get();
    if (managerDoc.exists) {
        userProfileDoc = managerDoc;
        userRole = 'manager';
        firestoreProfile = userProfileDoc.data();
    } else {
        const tenantDoc = await firestore.collection('tenants').doc(userRecord.uid).get();
        if (tenantDoc.exists) {
            userProfileDoc = tenantDoc;
            userRole = 'tenant';
            firestoreProfile = userProfileDoc.data();
        } else {
           // Fallback to landlord if no specific profile found
           // This covers the case where a landlord signs up but hasn't created other profiles yet.
           userRole = 'landlord';
        }
    }
    
    // 3. Combine Auth and Firestore data
    const userProfile: User = {
        uid: userRecord.uid,
        email: userRecord.email!,
        name: userRecord.displayName || firestoreProfile.name || 'Unnamed User',
        role: firestoreProfile.role || userRole,
        profileComplete: firestoreProfile.profileComplete ?? userRecord.customClaims?.profileComplete ?? false,
        avatarUrl: userRecord.photoURL,
        permissions: firestoreProfile.permissions || {},
    };

    // 4. Generate a session cookie with the complete profile
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
