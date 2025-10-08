
'use server';

import { auth, firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { authConfig } from '@/config/server-config';
import type { User } from '@/hooks/use-auth';
import { FieldValue } from 'firebase-admin/firestore';


/**
 * Creates a user profile in Firestore and sets custom claims.
 * Assumes the user has already been created on the client.
 * @param params - The user's details.
 * @returns The user record from Firebase Auth.
 */
export async function signUpUser({ uid, email, displayName }: { uid: string, email: string; displayName: string; }) {
    if (!isFirebaseAdminInitialized) {
        throw new Error('Firebase Admin SDK is not initialized. Authentication services are unavailable.');
    }
    
    try {
        const userRecord = await auth.getUser(uid);
        
        await auth.setCustomUserClaims(userRecord.uid, { role: 'landlord', profileComplete: false });
        
        const landlordDocRef = firestore.collection('landlords').doc(userRecord.uid);
        await landlordDocRef.set({
            uid: userRecord.uid,
            email: userRecord.email,
            name: userRecord.displayName,
            role: 'landlord',
            createdAt: FieldValue.serverTimestamp(),
        });

        return userRecord;

    } catch (error: unknown) {
        const typedError = error as { code?: string, message: string };
        console.error('[AUTH_SERVICE_ERROR] Failed to set up user profile:', typedError);
        throw new Error(`Could not set up user profile: ${typedError.message}`);
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
    if (!isFirebaseAdminInitialized) {
        console.error('[AUTH_SERVICE_ERROR] Firebase Admin SDK is not initialized');
        throw new Error('Firebase Admin SDK is not initialized. Authentication services are unavailable.');
    }

    try {
        const userRecord = await auth.getUser(uid);
        
        if (!userRecord) {
            console.warn(`[AUTH_SERVICE] User not found in Firebase Auth: ${uid}`);
            return null;
        }

        const userRoleClaim = userRecord.customClaims?.role || 'landlord';
        
        const collections: Record<string, string> = {
            manager: 'managers',
            tenant: 'tenants',
            landlord: 'landlords'
        };
        const collectionName = collections[userRoleClaim];
        let firestoreProfile: Record<string, unknown> = {};
        
        if (collectionName) {
            const docRef = firestore.collection(collectionName).doc(userRecord.uid);
            const doc = await docRef.get();
            
            if (doc.exists) {
                firestoreProfile = doc.data() || {};
            } else {
                // If a user exists in Auth but not Firestore (e.g. social sign-in), create a profile.
                console.log(`[AUTH_SERVICE] No Firestore profile found for UID ${uid}. Creating one in '${collectionName}'.`);
                const newProfileData: Record<string, unknown> = {
                    uid: userRecord.uid,
                    email: userRecord.email,
                    name: userRecord.displayName || 'New User',
                    role: userRoleClaim,
                    createdAt: FieldValue.serverTimestamp(),
                };
                
                // Add role-specific default fields
                if (userRoleClaim === 'manager') {
                  newProfileData.permissions = {};
                  newProfileData.propertiesManaged = [];
                }
                 if (userRoleClaim === 'landlord') {
                  newProfileData.profileComplete = false;
                }
                
                await docRef.set(newProfileData);
                firestoreProfile = newProfileData;
            }
        }
        
        const isProfileComplete = userRecord.customClaims?.profileComplete ?? (firestoreProfile?.profileComplete as boolean) ?? false;
        
        // If claims are out of sync with Firestore, update them
        if (userRecord.customClaims?.profileComplete !== isProfileComplete) {
            await auth.setCustomUserClaims(userRecord.uid, { ...userRecord.customClaims, profileComplete: isProfileComplete });
        }


        return {
            // Start with all data from Firestore, making it the base source of truth.
            ...firestoreProfile,
            // Explicitly set or override with values from Firebase Auth which are more authoritative or foundational.
            uid: userRecord.uid,
            email: userRecord.email || '',
            // Prioritize Firestore name, but fall back to Auth display name if Firestore's is missing.
            name: (firestoreProfile.name as string) || userRecord.displayName || 'Unnamed User',
            // Prioritize Firestore role, but fall back to the auth claim.
            role: (firestoreProfile.role as User['role']) || userRoleClaim,
            profileComplete: isProfileComplete,
            // Auth is the source of truth for avatar.
            avatarUrl: userRecord.photoURL || undefined,
            // Ensure permissions from Firestore are included.
            permissions: (firestoreProfile.permissions as User['permissions']) || {},
        } as User;
    } catch (error: unknown) {
        const typedError = error as { code?: string, message: string };
        console.error('[AUTH_SERVICE_ERROR] Failed to get user profile:', {
            uid,
            error: typedError.message,
            code: typedError.code
        });
        throw error; // Re-throw to be caught by the API route
    }
}


/**
 * Verifies an ID token, fetches the user profile, and creates a session cookie.
 * @param idToken - The Firebase ID token from the client.
 * @returns An object containing the session cookie and the user's profile.
 */
export async function createSession(idToken: string): Promise<{ sessionCookie: string; userProfile: User; }> {
    if (!isFirebaseAdminInitialized) {
        throw new Error('Firebase Admin SDK is not initialized. Authentication services are unavailable.');
    }

    const decodedToken = await auth.verifyIdToken(idToken);
    
    const userProfile = await getUserProfile(decodedToken.uid);

    if (!userProfile) {
        // This case should be rare now with the creation logic in getUserProfile, but it's a good safeguard.
        throw new Error("User profile could not be found or created.");
    }
    
    // For non-tenant roles, if the profile is incomplete, the client-side will handle the redirect.
    // We no longer throw an error here, ensuring the session cookie is always set on successful login.

    // Use the maxAge from the config to set the cookie expiration.
    const expiresIn = authConfig.cookieSerializeOptions.maxAge * 1000;
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });

    return { sessionCookie, userProfile };
}
