
"use server";

import { revalidatePath } from 'next/cache';
import { v4 as uuid } from 'uuid';
import { PropertyFormSchema, type PropertyFormValues } from '@/lib/schemas';

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
  // This is a mock implementation since Firebase is removed.
  
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

  const validatedData = validationResult.data;

  try {
    const propertyId = uuid();
    console.log(`Mock creating property with ID ${propertyId} and data:`, validatedData);
    
    // In a real app, you would save this to a database.
    // For now, we just simulate success.
    
    revalidatePath('/properties');
    revalidatePath('/dashboard');
    
    return { success: true, propertyId: propertyId };

  } catch (error: any) {
    console.error('[MOCK_PROPERTY_CREATE_ACTION_ERROR]', error);
    return { error: `Internal Server Error: ${error.message}` };
  }
}
