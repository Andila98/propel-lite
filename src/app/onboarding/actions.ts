
'use server';

import { auth, firestore, isFirebaseAdminInitialized } from "@/lib/firebase-admin";
import { cookies } from "next/headers";
import { authConfig } from "@/config/server-config";


export interface ActionState {
    error?: string;
    success?: boolean;
}

export async function completeOnboarding(): Promise<ActionState> {
  if (!isFirebaseAdminInitialized) {
    return { error: 'Backend services are not configured. Please contact support.' };
  }
  try {
    const sessionCookie = (await cookies()).get(authConfig.cookieName)?.value;
    if (!sessionCookie) {
        return { error: 'You must be logged in to complete onboarding.' };
    }

    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    
    // Security check: Ensure the user has added at least one property.
    const propertiesSnapshot = await firestore.collection('properties')
        .where('landlordId', '==', decodedClaims.uid)
        .limit(1)
        .get();

    if (propertiesSnapshot.empty) {
        return { error: "You must add at least one property to complete the setup." };
    }

    // Get the user record to access existing custom claims safely.
    const userRecord = await auth.getUser(decodedClaims.uid);
    const existingCustomClaims = userRecord.customClaims || {};

    // Set a custom claim to indicate the profile is now complete
    await auth.setCustomUserClaims(decodedClaims.uid, { 
        ...existingCustomClaims, // Preserve existing custom claims
        profileComplete: true 
    });
    
    return { success: true };
  } catch (error: unknown) {
    const typedError = error as Error;
    console.error('[ERROR: completeOnboarding action]', typedError);
    return { error: `Internal Server Error: ${typedError.message}` };
  }
}
