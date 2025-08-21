
"use server";

import { auth, firestore } from "@/lib/firebase-admin";
import { cookies } from "next/headers";
import { authConfig } from "@/config/server-config";


export interface ActionState {
    error?: string;
    success?: boolean;
}

export async function completeOnboarding(): Promise<ActionState> {
  try {
    const sessionCookie = cookies().get(authConfig.cookieName)?.value;
    if (!sessionCookie) {
        return { error: 'You must be logged in to complete onboarding.' };
    }

    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    
    // Set a custom claim to indicate the profile is now complete
    await auth.setCustomUserClaims(decodedClaims.uid, { 
        ...decodedClaims, // Preserve existing claims
        profileComplete: true 
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('[COMPLETE_ONBOARDING_ACTION_ERROR]', error);
    return { error: `Internal Server Error: ${error.message}` };
  }
}

    
