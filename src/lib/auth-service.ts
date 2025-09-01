
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
    // Check if user already exists
    const existingUser = await auth.getUserByEmail(email).catch(err => {
        if (err.code === 'auth/user-not-found') return null;
        throw err;
    });

    if (existingUser) {
        throw new Error('An account with this email already exists.');
    }
    
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
        // Transform the error to a more user-friendly message
        if (error.code === 'auth/email-already-exists') {
            throw new Error('An account with this email already exists.');
        }
        throw new Error(`Could not sign up user: ${error.message}`);
    }
}


/**
 * Fetches the complete user profile from Firestore based on the UID.
 * This function treats the Firestore document as the source of truth for role and permissions.
 * If a user exists in Auth but not Firestore, it creates a profile for them.
 * @param uid - The user's unique ID.
 * @returns A complete user profile object, or null if not found.
 */
export async function getUserProfile(uid: string): Promise<User | null> {
    const userRecord = await auth.getUser(uid).catch(() => null);
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
            // If a user exists in Auth but not Firestore (e.g. social sign-in), create a profile.
            console.log(`[AUTH_SERVICE] No Firestore profile found for UID ${uid}. Creating one in '${collectionName}'.`);
            const newProfileData = {
                uid: userRecord.uid,
                email: userRecord.email,
                name: userRecord.displayName || 'New User',
                role: userRoleClaim,
                createdAt: new Date(),
                // For managers, you might want to set default empty permissions
                ...(userRoleClaim === 'manager' && { permissions: {}, propertiesManaged: [] }),
            };
            await docRef.set(newProfileData);
            firestoreProfile = newProfileData;
        }
    }

    return {
        // Start with all data from Firestore, making it the base source of truth.
        ...firestoreProfile,
        // Explicitly set or override with values from Firebase Auth which are more authoritative or foundational.
        uid: userRecord.uid,
        email: userRecord.email || '',
        // Prioritize Firestore name, but fall back to Auth display name if Firestore's is missing.
        name: firestoreProfile.name || userRecord.displayName || 'Unnamed User',
        // Prioritize Firestore role, but fall back to the auth claim.
        role: firestoreProfile.role || userRoleClaim,
        profileComplete: userRecord.customClaims?.profileComplete ?? false,
        // Auth is the source of truth for avatar.
        avatarUrl: userRecord.photoURL || undefined,
        // Ensure permissions from Firestore are included.
        permissions: firestoreProfile.permissions || {},
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
        // This case should be rare now with the creation logic in getUserProfile, but it's a good safeguard.
        throw new Error("User profile could not be found or created.");
    }
    
    // For non-tenant roles, if the profile is incomplete, block session creation
    // and let the client-side handle redirection to onboarding.
    if (userProfile.role !== 'tenant' && !userProfile.profileComplete) {
      const error: any = new Error('Your account setup is not complete. Please finish the onboarding process.');
      error.code = 'INCOMPLETE_PROFILE';
      throw error;
    }

    // Use the maxAge from the config to set the cookie expiration.
    const expiresIn = authConfig.cookieSerializeOptions.maxAge * 1000;
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });

    return { sessionCookie, userProfile };
}
