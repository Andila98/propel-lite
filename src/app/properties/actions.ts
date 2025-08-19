
"use server";

import { revalidatePath } from 'next/cache';
import { PropertyFormSchema, type PropertyFormValues } from '@/lib/schemas';
import { firestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export interface FormState {
    error?: string;
    errors?: {
        [key: string]: string[] | undefined;
        units?: string[] | undefined;
    } & {
        [key in `units.${number}.${keyof PropertyFormValues['units'][0]}`]?: string[];
    }
    success?: boolean;
    propertyId?: string;
}

export async function createPropertyAction(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const propertyDataString = formData.get('propertyData') as string | null;
  
  if (!propertyDataString) {
      return { error: 'Missing propertyData.' };
  }
    
  let propertyData;
  try {
      propertyData = JSON.parse(propertyDataString);
  } catch (e) {
      return { error: 'Invalid propertyData JSON.' };
  }

  const validationResult = PropertyFormSchema.safeParse(propertyData);
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
        // Create the main property document
        transaction.set(propertyRef, {
            ...mainPropertyData,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            // TODO: Add landlordId from session
        });

        // Create a subcollection for units
        units.forEach(unit => {
            const unitRef = propertyRef.collection('units').doc();
            transaction.set(unitRef, unit);
        });
    });
    
    revalidatePath('/properties');
    revalidatePath('/dashboard');
    
    return { success: true, propertyId: propertyRef.id };

  } catch (error: any) {
    console.error('[CREATE_PROPERTY_ACTION_ERROR]', error);
    return { error: `Internal Server Error: ${error.message}` };
  }
}
