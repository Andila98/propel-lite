

'use server';

import { revalidatePath } from 'next/cache';
import { PropertyFormSchema, PropertyFormValues } from '@/lib/schemas';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logActivity } from '@/lib/audit-log-service';
import { getLandlordAndActor } from '@/lib/auth-utils';
import { cookies } from 'next/headers';
import { authConfig } from '@/config/server-config';
import { z } from 'zod';


export interface FormState {
    error?: string;
    errors?: z.ZodError<PropertyFormValues>['formErrors']['fieldErrors'];
    success?: boolean;
    propertyId?: string;
}

export async function updatePropertyAction(
  propertyId: string,
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  if (!isFirebaseAdminInitialized) {
    return { error: 'Backend services are not configured. Please contact support.' };
  }

  const sessionCookie = (await cookies()).get(authConfig.cookieName)?.value;
  if (!sessionCookie) {
    return { error: 'Unauthorized. Please log in.' };
  }

  const { landlordId, actor, error: authError } = await getLandlordAndActor(sessionCookie);
  if (authError || !landlordId || !actor) {
    return { error: authError?.message || 'Unauthorized. Could not identify user.' };
  }
  
  if (actor.customClaims?.role === 'manager' && !actor.customClaims?.permissions?.canEditProperties) {
    return { error: "You don't have permission to edit properties." };
  }
  if (actor.customClaims?.role !== 'landlord' && actor.customClaims?.role !== 'manager') {
    return { error: "You are not authorized to perform this action." };
  }
  
  const rawData = {
    name: formData.get('name'),
    address: formData.get('address'),
    type: formData.get('type'),
    currency: formData.get('currency'),
    description: formData.get('description'),
    units: JSON.parse(formData.get('units') as string),
    numberOfUnits: Number(formData.get('numberOfUnits')),
    imageUrl: formData.get('imageUrl') || undefined,
  };
  
  const validationResult = PropertyFormSchema.safeParse(rawData);

  if (!validationResult.success) {
    console.error("[ERROR: updatePropertyAction validation]", validationResult.error.flatten());
    return { 
        error: "Invalid property data. Please check the form for errors.",
        errors: validationResult.error.flatten().fieldErrors,
     };
  }

  const { units, ...mainPropertyData } = validationResult.data;

  try {
    const propertyRef = firestore.collection('properties').doc(propertyId);
    
    // Get existing units to compare
    const existingUnitsSnapshot = await propertyRef.collection('units').get();
    const existingUnitIds = new Set(existingUnitsSnapshot.docs.map(doc => doc.id));

    await firestore.runTransaction(async (transaction) => {
        transaction.update(propertyRef, {
            ...mainPropertyData,
            updatedAt: FieldValue.serverTimestamp(),
        });

        // Add or update units
        units.forEach(unit => {
            const unitRef = unit.id ? propertyRef.collection('units').doc(unit.id) : propertyRef.collection('units').doc();
            transaction.set(unitRef, { ...unit, landlordId }, { merge: true }); // Ensure landlordId is set on units
            if (unit.id) {
                existingUnitIds.delete(unit.id);
            }
        });
        
        // Delete units that are no longer in the list
        existingUnitIds.forEach(unitIdToDelete => {
            const unitRef = propertyRef.collection('units').doc(unitIdToDelete);
            transaction.delete(unitRef);
        });
    });

    await logActivity(actor.displayName || 'Admin', `Updated property "${mainPropertyData.name}"`, { type: 'Property', name: mainPropertyData.name }, landlordId);
    
    revalidatePath('/properties');
    revalidatePath(`/properties/${propertyId}`);
    revalidatePath('/dashboard');
    
    return { success: true, propertyId };

  } catch (error: unknown) {
    const typedError = error as Error;
    console.error('[ERROR: updatePropertyAction]', typedError);
    return { error: `Internal Server Error: ${typedError.message}` };
  }
}
