
/**
 * @fileOverview A service class for handling all authentication-related backend operations.
 * This centralizes logic for creating users, managing sessions, and handling roles.
 */
import { auth, firestore } from '@/lib/firebase-admin';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { authConfig } from '@/config/server-config';
import { z } from 'zod';
import type { User } from '@/lib/types';

// Define a strict schema for the user data in Firestore for validation.
const UserSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['landlord', 'tenant', 'admin', 'manager']),
  createdAt: z.any(),
  profileComplete: z.boolean(),
  // Optional fields that might not be on every user document
  landlordId: z.string().optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  currentUnitId: z.string().optional(),
  leaseEnd: z.any().optional(),
  leaseStart: z.any().optional(),
  paymentHistory: z.array(z.any()).optional(),
  rentStatus: z.string().optional(),
  status: z.string().optional(),
});

class AuthService {
    /**
     * Provisions a new user account, setting custom claims and creating a Firestore record.
     * @param idToken The Firebase ID token from the client.
     * @returns The created user's UID.
     */
    async provisionUser(idToken: string): Promise<string> {
        const decodedToken = await auth.verifyIdToken(idToken);
        const { uid, email, name } = decodedToken;

        if (!name) {
            throw new Error("Display name is missing from the token.");
        }

        await auth.setCustomUserClaims(uid, { role: 'landlord' });

        const userRef = firestore.collection('users').doc(uid);
        await userRef.set({
            uid,
            email,
            name,
            role: 'landlord',
            createdAt: firestore.FieldValue.serverTimestamp(),
            profileComplete: false,
        });

        console.log(`[AUTH_SERVICE] Landlord account provisioned for UID: ${uid}`);
        return uid;
    }

    /**
     * Verifies a user's ID token and retrieves their profile from Firestore.
     * @param idToken The Firebase ID token from the client.
     * @returns The user's data including role and profile completion status.
     */
    async verifyAndFetchUser(idToken: string): Promise<{ user: User, decodedToken: DecodedIdToken }> {
        const decodedToken = await auth.verifyIdToken(idToken);
        const userDoc = await firestore.collection('users').doc(decodedToken.uid).get();

        if (!userDoc.exists) {
            throw new Error('User data not found in our system.');
        }

        const validationResult = UserSchema.safeParse(userDoc.data());
        if (!validationResult.success) {
            console.error(`[AUTH_SERVICE_SCHEMA_MISMATCH] UID: ${decodedToken.uid}`, validationResult.error.flatten());
            throw new Error('User data is malformed.');
        }
        
        return { user: validationResult.data as User, decodedToken };
    }

    /**
     * Creates a session cookie for the authenticated user.
     * @param idToken The Firebase ID token.
     * @returns The session cookie string.
     */
    async createSession(idToken: string): Promise<string> {
        const expiresIn = authConfig.cookieSerializeOptions.maxAge! * 1000;
        const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });
        return sessionCookie;
    }

    /**
     * Revokes all refresh tokens for a given user, effectively logging them out of all sessions.
     * @param uid The user's UID.
     */
    async revokeSession(uid: string): Promise<void> {
        await auth.revokeRefreshTokens(uid);
        console.log(`[AUTH_SERVICE] Revoked refresh tokens for UID: ${uid}`);
    }
}

export const authService = new AuthService();
