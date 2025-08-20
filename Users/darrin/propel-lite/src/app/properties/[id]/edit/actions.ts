
"use server";

import { revalidatePath } from 'next/cache';
import { PropertyFormSchema, type PropertyFormValues } from '@/lib/schemas';
import { firestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logActivity } from '@/lib/audit-log-service';

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

export async function updatePropertyAction(
  propertyId: string,
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
    const propertyRef = firestore.collection('properties').doc(propertyId);
    const existingUnitsSnapshot = await propertyRef.collection('units').get();
    const existingUnitIds = new Set(existingUnitsSnapshot.docs.map(doc => doc.id));


    await firestore.runTransaction(async (transaction) => {
        transaction.update(propertyRef, {
            ...mainPropertyData,
            updatedAt: FieldValue.serverTimestamp(),
        });
        
        const newUnitIds = new Set<string>();

        for (const unit of units) {
            let unitRef;
            if (unit.id && existingUnitIds.has(unit.id)) {
                // Update existing unit
                unitRef = propertyRef.collection('units').doc(unit.id);
                transaction.update(unitRef, unit);
                newUnitIds.add(unit.id);
            } else {
                // Add new unit
                unitRef = propertyRef.collection('units').doc();
                transaction.set(unitRef, unit);
            }
        }
        
        // Delete units that are no longer in the list
        for (const unitDoc of existingUnitsSnapshot.docs) {
            if (!newUnitIds.has(unitDoc.id)) {
                transaction.delete(unitDoc.ref);
            }
        }
    });

    // TODO: Get actor name from session
    await logActivity('Admin', `Updated property "${mainPropertyData.name}"`, { type: 'Property', name: mainPropertyData.name });
    
    revalidatePath('/properties');
    revalidatePath(`/properties/${propertyId}`);
    revalidatePath(`/properties/${propertyId}/edit`);
    revalidatePath('/dashboard');
    
    return { success: true, propertyId: propertyRef.id };

  } catch (error: any) {
    return { error: `Internal Server Error: ${error.message}` };
  }
}
