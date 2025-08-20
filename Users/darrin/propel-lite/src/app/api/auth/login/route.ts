
import { type NextRequest, NextResponse } from 'next/server';
import { auth, firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { authConfig } from '@/config/server-config';
import { serialize } from 'cookie';
import type { User } from '@/hooks/use-auth';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  if (!isFirebaseAdminInitialized) {
      return NextResponse.json({ error: 'Firebase is not initialized. Please check server credentials.' }, { status: 500 });
  }

  const authToken = request.headers.get('Authorization')?.split('Bearer ')[1];

  if (!authToken) {
    return NextResponse.json({ error: 'Missing authorization token.' }, { status: 401 });
  }

  try {
    const decodedToken = await auth.verifyIdToken(authToken);
    const expiresIn = 60 * 60 * 24 * 14 * 1000; // 14 days
    const sessionCookie = await auth.createSessionCookie(authToken, { expiresIn });

    let userRecord = await auth.getUser(decodedToken.uid);
    let userProfile: User;

    // Check if user exists in any of our role collections
    const landlordDoc = await firestore.collection('users').doc(userRecord.uid).get();
    const tenantDoc = await firestore.collection('tenants').doc(userRecord.uid).get();
    const managerDoc = await firestore.collection('managers').doc(userRecord.uid).get();
    
    if (landlordDoc.exists || tenantDoc.exists || managerDoc.exists) {
        // User exists, build profile from existing data
         userProfile = {
            uid: userRecord.uid,
            email: userRecord.email!,
            name: userRecord.displayName || 'Unnamed User',
            role: (userRecord.customClaims?.role as any) || 'tenant', // Default role
            profileComplete: userRecord.customClaims?.profileComplete || false,
            avatarUrl: userRecord.photoURL,
        };
    } else {
        // This is a new user (likely from social login)
        // Create a basic profile for them. They must complete onboarding.
        const newUserRole = 'landlord'; // Default new sign-ups to landlord
        
        await firestore.collection('users').doc(userRecord.uid).set({
            uid: userRecord.uid,
            name: userRecord.displayName,
            email: userRecord.email,
            role: newUserRole,
            createdAt: FieldValue.serverTimestamp(),
        });
        
        // Set custom claims for the new user
        await auth.setCustomUserClaims(userRecord.uid, { role: newUserRole, profileComplete: false });
        
        userProfile = {
            uid: userRecord.uid,
            email: userRecord.email!,
            name: userRecord.displayName || 'Unnamed User',
            role: newUserRole,
            profileComplete: false,
            avatarUrl: userRecord.photoURL,
        };
    }
    
    const cookie = serialize(authConfig.cookieName, sessionCookie, authConfig.cookieSerializeOptions);

    const response = NextResponse.json(userProfile, { status: 200 });
    response.headers.set('Set-Cookie', cookie);
    return response;

  } catch (error: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
