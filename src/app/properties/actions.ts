
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

export async function createPropertyAction(
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
  let imageUrl = mainPropertyData.imageUrl || null; // Use existing URL if present

  try {
    if (imageFile && imageFile.size > 0) {
        // A new image has been uploaded, handle it
        const fileExtension = imageFile.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExtension}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('properties') // your bucket name
            .upload(fileName, imageFile, {
                contentType: imageFile.type,
                upsert: true,
            });

        if (uploadError) {
            throw new Error(`Supabase upload failed: ${uploadError.message}`);
        }
        
        // Get the public URL of the uploaded image
        const { data: urlData } = supabase.storage
            .from('properties')
            .getPublicUrl(uploadData.path);
            
        imageUrl = urlData.publicUrl;
    }

    const propertyRef = firestore.collection('properties').doc();

    await firestore.runTransaction(async (transaction) => {
        transaction.set(propertyRef, {
            ...mainPropertyData,
            imageUrl: imageUrl, // Save the new or existing image URL
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
    console.error('[CREATE_PROPERTY_ACTION_ERROR]', error);
    return { error: `Internal Server Error: ${error.message}` };
  }
}
