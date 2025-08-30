
'use server';

import { auth, firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { authConfig } from '@/config/server-config';
import type { User } from '@/hooks/use-auth';

if (!isFirebaseAdminInitialized) {
    throw new Error('Firebase Admin SDK is not initialized. Authentication services are unavailable.');
}

/**
 * Creates a new user in Firebase Auth and a corresponding profile in Firestore.
 * @param params - The user's details.
 * @returns The created user record from Firebase Auth.
 */
export async function signUpUser({ email, password, displayName }: { email: string; password?: string; displayName: string; }) {
    try {
        const userRecord = await auth.createUser({ email, password, displayName });
        
        await auth.setCustomUserClaims(userRecord.uid, { role: 'landlord', profileComplete: false });
        
        const landlordDocRef = firestore.collection('landlords').doc(userRecord.uid);
        await landlordDocRef.set({
            uid: userRecord.uid,
            email: userRecord.email,
            name: userRecord.displayName,
            role: 'landlord',
            createdAt: new Date(),
        });

        return userRecord;

    } catch (error: any) {
        console.error('[AUTH_SERVICE_ERROR] Failed to sign up user:', error);
        throw new Error(`Could not sign up user: ${error.code}`);
    }
}


/**
 * Fetches the complete user profile from Firestore based on the UID.
 * This function treats the Firestore document as the source of truth for role and permissions.
 * @param uid - The user's unique ID.
 * @returns A complete user profile object, or null if not found.
 */
export async function getUserProfile(uid: string): Promise<User | null> {
    const userRecord = await auth.getUser(uid);
    if (!userRecord) return null;

    const userRoleClaim = userRecord.customClaims?.role || 'landlord';
    
    const collections: Record<string, string> = {
        manager: 'managers',
        tenant: 'tenants',
        landlord: 'landlords'
    };
    const collectionName = collections[userRoleClaim];
    let firestoreProfile: any = {};
    
    if (collectionName) {
        const docRef = firestore.collection(collectionName).doc(userRecord.uid);
        const doc = await docRef.get();
        
        if (doc.exists) {
            firestoreProfile = doc.data();
        } else {
            const newProfileData = {
                uid: userRecord.uid,
                email: userRecord.email,
                name: userRecord.displayName || 'New User',
                role: userRoleClaim,
                createdAt: new Date(),
            };
            await docRef.set(newProfileData);
            console.log(`[AUTH_SERVICE] Created missing Firestore profile for user ${uid} in collection ${collectionName}.`);
            firestoreProfile = newProfileData;
        }
    }

    return {
        uid: userRecord.uid,
        email: userRecord.email || '',
        name: userRecord.displayName || firestoreProfile.name || 'Unnamed User',
        role: firestoreProfile.role || userRoleClaim,
        profileComplete: userRecord.customClaims?.profileComplete ?? false,
        avatarUrl: userRecord.photoURL || undefined,
        permissions: firestoreProfile.permissions || {},
        ...firestoreProfile
    };
}


/**
 * Verifies an ID token, fetches the user profile, and creates a session cookie.
 * @param idToken - The Firebase ID token from the client.
 * @returns An object containing the session cookie and the user's profile.
 */
export async function createSession(idToken: string): Promise<{ sessionCookie: string; userProfile: User; }> {
    const decodedToken = await auth.verifyIdToken(idToken);
    
    const userProfile = await getUserProfile(decodedToken.uid);

    if (!userProfile) {
        throw new Error("User profile could not be found or created.");
    }
    
    // Check if the user's profile is complete before creating a session.
    if (userProfile.role !== 'tenant' && !userProfile.profileComplete) {
        throw new Error('Your account setup is not complete. Please finish the onboarding process.');
    }

    const expiresIn = authConfig.cookieSerializeOptions.maxAge * 1000;
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });

    return { sessionCookie, userProfile };
}
