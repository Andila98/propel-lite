
"use server";

import { revalidatePath } from 'next/cache';
import { PropertyFormSchema } from '@/lib/schemas';
import { firestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logActivity } from '@/lib/audit-log-service';
import type { FormState } from './[id]/edit/actions';

export async function createPropertyAction(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
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
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        units.forEach(unit => {
            const unitRef = propertyRef.collection('units').doc();
            transaction.set(unitRef, unit);
        });
    });

    // TODO: Get actor name from session
    await logActivity('Admin', `Created property "${mainPropertyData.name}"`, { type: 'Property', name: mainPropertyData.name });
    
    revalidatePath('/properties');
    revalidatePath('/dashboard');
    
    return { success: true, propertyId: propertyRef.id };

  } catch (error: any) {
    return { error: `Internal Server Error: ${error.message}` };
  }
}
