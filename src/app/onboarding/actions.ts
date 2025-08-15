
"use server";

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebase-admin';
import { verifyServerActionAuth } from '@/lib/server-utils';

export interface ActionState {
    error?: string;
    success?: boolean;
}

export async function completeOnboarding(): Promise<ActionState> {
  const { decodedToken, error: authError } = await verifyServerActionAuth(['landlord']);
  if (authError) {
    return { error: authError.error };
  }
  const userId = decodedToken.uid;

  try {
    const userRef = db().collection('users').doc(userId);
    await userRef.update({
        profileComplete: true,
    });
    
    // Revalidate the root path to ensure the auth state is fresh
    revalidatePath('/');
    
    return { success: true };

  } catch (error: any) {
    console.error('[COMPLETE_ONBOARDING_ACTION_ERROR]', error);
    return { error: `Internal Server Error: ${error.message}` };
  }
}
