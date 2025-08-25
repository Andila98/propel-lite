
import { type NextRequest, NextResponse } from 'next/server';
import { auth, firestore } from '@/lib/firebase-admin';
import { authConfig } from '@/config/server-config';
import type { User } from '@/hooks/use-auth';
import { verifySession } from '@/lib/auth-utils';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  let decodedToken;

  try {
    decodedToken = await verifySession(req);
    
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    } else if (userRole === 'landlord') {
       const landlordDoc = await firestore.collection('landlords').doc(userRecord.uid).get();
       if (landlordDoc.exists) firestoreProfile = landlordDoc.data();
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
