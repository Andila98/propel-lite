
import { NextResponse, type NextRequest } from 'next/server';
import { auth, firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { authConfig } from '@/config/server-config';
import type { User } from '@/hooks/use-auth';

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
    
    const decodedToken = await auth.verifyIdToken(idToken);
    const userRecord = await auth.getUser(decodedToken.uid);

    const userRole = userRecord.customClaims?.role || 'landlord';

    let firestoreProfile: any = {};
    if (userRole === 'manager') {
      const managerDoc = await firestore.collection('managers').doc(userRecord.uid).get();
      if (managerDoc.exists) {
        firestoreProfile = managerDoc.data();
      }
    } else if (userRole === 'tenant') {
      const tenantDoc = await firestore.collection('tenants').doc(userRecord.uid).get();
      if (tenantDoc.exists) {
        firestoreProfile = tenantDoc.data();
      }
    } else if (userRole === 'landlord') {
      const landlordDocRef = firestore.collection('landlords').doc(userRecord.uid);
      const landlordDoc = await landlordDocRef.get();
      if (landlordDoc.exists) {
        firestoreProfile = landlordDoc.data();
      } else {
        // First login for a new landlord, create their profile.
        firestoreProfile = {
          uid: userRecord.uid,
          email: userRecord.email,
          name: userRecord.displayName,
          createdAt: new Date(),
        };
        await landlordDocRef.set(firestoreProfile);
      }
    }
    
    const userProfile: User = {
        uid: userRecord.uid,
        email: userRecord.email || '',
        name: userRecord.displayName || firestoreProfile.name || 'Unnamed User',
        role: userRole,
        profileComplete: userRecord.customClaims?.profileComplete ?? false,
        avatarUrl: userRecord.photoURL,
        permissions: firestoreProfile.permissions || {},
        ...firestoreProfile
    };

    const expiresIn = authConfig.cookieSerializeOptions.maxAge * 1000;
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });
    
    const response = NextResponse.json(userProfile, { status: 200 });
    response.cookies.set(authConfig.cookieName, sessionCookie, authConfig.cookieSerializeOptions);

    return response;
  } catch (error: any) {
    console.error('[ERROR: /api/auth/login]', error);
    return NextResponse.json({ error: 'Invalid credentials. Please try again.' }, { status: 401 });
  }
}
