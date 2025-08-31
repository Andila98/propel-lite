
"use server";

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
    const sessionCookie = cookies().get(authConfig.cookieName)?.value;
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

    // Set a custom claim to indicate the profile is now complete
    await auth.setCustomUserClaims(decodedClaims.uid, { 
        ...decodedClaims, // Preserve existing claims
        profileComplete: true 
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('[ERROR: completeOnboarding action]', error);
    return { error: `Internal Server Error: ${error.message}` };
  }
}
