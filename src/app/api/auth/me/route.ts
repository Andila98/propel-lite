
import { type NextRequest, NextResponse } from 'next/server';
import { auth, firestore } from '@/lib/firebase-admin';
import { authConfig } from '@/config/server-config';
import type { User } from '@/hooks/use-auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  let decodedToken;

  try {
    const sessionCookie = req.cookies.get(authConfig.cookieName)?.value;
    const authToken = req.headers.get('Authorization')?.split('Bearer ')[1];

    if (sessionCookie) {
      decodedToken = await auth.verifySessionCookie(sessionCookie, true);
    } else if (authToken) {
      decodedToken = await auth.verifyIdToken(authToken, true);
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRecord = await auth.getUser(decodedToken.uid);

    // Fetch the user's profile from Firestore
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
            firestoreProfile = tenantDoc.data();
        } else {
           userRole = userRecord.customClaims?.role || 'landlord';
        }
    }

    const userProfile: User = {
        uid: userRecord.uid,
        email: userRecord.email || '',
        name: userRecord.displayName || firestoreProfile.name || 'Unnamed User',
        role: firestoreProfile.role || userRole,
        profileComplete: firestoreProfile.profileComplete ?? userRecord.customClaims?.profileComplete ?? false,
        avatarUrl: userRecord.photoURL,
        permissions: firestoreProfile.permissions || {},
    };
    
    return NextResponse.json(userProfile, { status: 200 });
    
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Unauthorized: Invalid token or session.' }, { status: 401 });
  }
}
