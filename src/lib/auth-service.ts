
import { auth, firestore } from "./firebase-admin";
import { authConfig } from "@/config/server-config";
import type { User } from "./types";

export async function authenticateUser(email: string, password: string) {
  // Implement authentication logic
  return null;
}

export async function createUser(email: string, password: string) {
  try {
    const user = await auth.createUser({
      email,
      password,
    });
    return user;
  } catch (error) {
    throw error;
  }
}

export async function createSession(idToken: string) {
    const decodedIdToken = await auth.verifyIdToken(idToken);
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });

    const landlordRef = firestore.collection('landlords').doc(decodedIdToken.uid);
    const landlordSnap = await landlordRef.get();
    
    let userProfile: Partial<User> = {
        uid: decodedIdToken.uid,
        name: decodedIdToken.name,
        email: decodedIdToken.email,
        role: 'landlord',
        profileComplete: false, // Default value
    };

    if (landlordSnap.exists) {
        const landlordData = landlordSnap.data();
        userProfile = { ...userProfile, ...landlordData };
    }

    return { sessionCookie, userProfile };
}
