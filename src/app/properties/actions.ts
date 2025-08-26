
"use server";

import { revalidatePath } from 'next/cache';
import { PropertyFormSchema } from '@/lib/schemas';
import { auth, firestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logActivity } from '@/lib/audit-log-service';
import type { FormState } from './[id]/edit/actions';
import { getUserIdFromRequest } from '@/lib/auth-utils';
import { cookies } from 'next/headers';
import { authConfig } from '@/config/server-config';

export async function createPropertyAction(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const sessionCookie = cookies().get(authConfig.cookieName)?.value;
  if (!sessionCookie) {
    return { error: 'Unauthorized. Please log in.' };
  }

  let actor;
  try {
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    actor = await auth.getUser(decodedClaims.uid);
    if (actor.customClaims?.role !== 'landlord' && !actor.customClaims?.permissions?.canAddProperties) {
       return { error: "You don't have permission to create properties." };
    }
  } catch (error) {
     return { error: 'Unauthorized. Please log in.' };
  }


  const rawData = {
    name: formData.get('name'),
    address: formData.get('address'),
    type: formData.get('type'),
    currency: formData.get('currency'),
    description: formData.get('description'),
    imageUrl: formData.get('imageUrl'),
    units: JSON.parse(formData.get('units') as string),
    numberOfUnits: Number(formData.get('numberOfUnits')),
  };

  const validationResult = PropertyFormSchema.safeParse(rawData);
  if (!validationResult.success) {
      console.error("Server Action Validation Error:", validationResult.error.flatten());
      return { 
          error: "Invalid property data. Please check the form for errors.",
          errors: validationResult.error.flatten().fieldErrors,
       };
  }

  const { units, ...mainPropertyData } = validationResult.data;

  try {
    const propertyRef = firestore.collection('properties').doc();

    await firestore.runTransaction(async (transaction) => {
        transaction.set(propertyRef, {
            ...mainPropertyData,
            landlordId: actor.uid, // Set landlordId to the logged-in user
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        units.forEach(unit => {
            const unitRef = propertyRef.collection('units').doc();
            transaction.set(unitRef, { ...unit, landlordId: actor.uid });
        });
    });

    await logActivity(actor.displayName || 'Admin', `Created property "${mainPropertyData.name}"`, { type: 'Property', name: mainPropertyData.name });
    
    revalidatePath('/properties');
    revalidatePath('/dashboard');
    
    return { success: true, propertyId: propertyRef.id };

  } catch (error: any) {
    console.error('[CREATE_PROPERTY_ACTION_ERROR]', error);
    return { error: `Internal Server Error: ${error.message}` };
  }
}
