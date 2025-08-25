
import { type NextRequest, NextResponse } from 'next/server';
import { auth, firestore } from '@/lib/firebase-admin';
import { authConfig } from '@/config/server-config';
import type { User } from '@/hooks/use-auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  let decodedToken;

  try {
    const sessionCookie = req.cookies.get(authConfig.cookieName)?.value;
    
    // Prioritize session cookie for web app authentication
    if (sessionCookie) {
      decodedToken = await auth.verifySessionCookie(sessionCookie, true);
    } else {
      // Fallback to Bearer token for other clients (e.g., mobile app, third-party)
      const authToken = req.headers.get('Authorization')?.split('Bearer ')[1];
      if (authToken) {
        decodedToken = await auth.verifyIdToken(authToken, true);
      } else {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const userRecord = await auth.getUser(decodedToken.uid);

    // 1. Get the primary role from custom claims (Source of Truth)
    const userRole = userRecord.customClaims?.role || 'landlord';

    // 2. Fetch supplemental profile data from Firestore based on the role
    let firestoreProfile: any = {};
    if (userRole === 'manager') {
      const managerDoc = await firestore.collection('managers').doc(userRecord.uid).get();
      if (managerDoc.exists) firestoreProfile = managerDoc.data();
    } else if (userRole === 'tenant') {
      const tenantDoc = await firestore.collection('tenants').doc(userRecord.uid).get();
      if (tenantDoc.exists) firestoreProfile = tenantDoc.data();
    }
    
    // 3. Combine Auth and Firestore data into a complete user profile
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
    
    return NextResponse.json(userProfile, { status: 200 });
    
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Unauthorized: Invalid token or session.' }, { status: 401 });
  }
}
