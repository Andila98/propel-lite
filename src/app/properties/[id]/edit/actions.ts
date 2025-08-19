
"use server";

import { revalidatePath } from 'next/cache';
import { PropertyFormSchema, type PropertyFormValues } from '@/lib/schemas';
import { firestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
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

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function updatePropertyAction(
  propertyId: string,
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const propertyDataString = formData.get('propertyData') as string | null;
  const imageFile = formData.get('image') as File | null;
  
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
  let imageUrl = mainPropertyData.imageUrl || null; 

  try {
    if (imageFile && imageFile.size > 0) {
        const fileExtension = imageFile.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExtension}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('properties')
            .upload(fileName, imageFile, {
                contentType: imageFile.type,
                upsert: true,
            });

        if (uploadError) {
            throw new Error(`Supabase upload failed: ${uploadError.message}`);
        }
        
        const { data: urlData } = supabase.storage
            .from('properties')
            .getPublicUrl(uploadData.path);
            
        imageUrl = urlData.publicUrl;
    } else if (imageUrl === null) {
        // Image was removed but not replaced
        // TODO: Optionally delete the old image from Supabase
    }


    const propertyRef = firestore.collection('properties').doc(propertyId);
    const existingUnitsSnapshot = await propertyRef.collection('units').get();
    const existingUnitIds = new Set(existingUnitsSnapshot.docs.map(doc => doc.id));


    await firestore.runTransaction(async (transaction) => {
        transaction.update(propertyRef, {
            ...mainPropertyData,
            imageUrl: imageUrl,
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
    console.error('[UPDATE_PROPERTY_ACTION_ERROR]', error);
    return { error: `Internal Server Error: ${error.message}` };
  }
}
