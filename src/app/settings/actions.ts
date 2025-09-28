

'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { auth, firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { getLandlordAndActor } from '@/lib/auth-utils';
import { cookies } from 'next/headers';
import { authConfig } from '@/config/server-config';

const ProfileFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email(),
  avatarUrl: z.string().url().optional().nullable(),
});

export interface ProfileFormState {
    error?: string;
    success?: boolean;
    errors?: {
        name?: string[];
        avatarUrl?: string[];
    }
}

export async function updateUserProfileAction(
    prevState: ProfileFormState,
    formData: FormData
): Promise<ProfileFormState> {
    if (!isFirebaseAdminInitialized) {
        return { error: 'Backend services are not configured.' };
    }
    const sessionCookie = (await cookies()).get(authConfig.cookieName)?.value;
    if (!sessionCookie) {
        return { error: 'Unauthorized. Please log in.' };
    }
    const { actor } = await getLandlordAndActor(sessionCookie);
    if (!actor) {
        return { error: 'Unauthorized. Could not identify user.' };
    }
    
    const rawData = {
        name: formData.get('name'),
        email: actor.email, // Email is not editable, use the one from the session
        avatarUrl: formData.get('avatarUrl'),
    };

    const validation = ProfileFormSchema.safeParse(rawData);
    if (!validation.success) {
        return {
            error: "Invalid data provided.",
            errors: validation.error.flatten().fieldErrors,
        }
    }
    
    const { name, avatarUrl } = validation.data;
    const collections: Record<string, string> = {
        manager: 'managers',
        tenant: 'tenants',
        landlord: 'landlords'
    };
    const collectionName = collections[actor.customClaims?.role];

    if (!collectionName) {
        return { error: "Could not determine user collection." };
    }

    try {
        const firestoreRef = firestore.collection(collectionName).doc(actor.uid);
        
        await Promise.all([
            auth.updateUser(actor.uid, {
                displayName: name,
                photoURL: avatarUrl || undefined,
            }),
            firestoreRef.update({
                name: name,
                avatarUrl: avatarUrl || null,
            })
        ]);

        revalidatePath('/settings');
        return { success: true };

    } catch (error: unknown) {
        const typedError = error as Error;
        console.error('[updateUserProfileAction ERROR]', typedError);
        return { error: 'Failed to update profile.' };
    }
}
