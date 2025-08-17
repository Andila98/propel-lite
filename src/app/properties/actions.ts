
"use server";

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { propertyService } from '@/services/property-service';
import { verifyServerActionAuth } from '@/lib/server-utils';
import { PropertyFormSchema, type PropertyFormValues } from '@/lib/schemas';
import path from 'path';
import { promises as fs } from 'fs';
import { randomBytes } from 'crypto';

const uploadDir = path.join(process.cwd(), 'public/media');

export interface FormState {
    error?: string;
    errors?: {
        [key in keyof PropertyFormValues]?: string[];
    };
    success?: boolean;
    propertyId?: string;
}

export async function createPropertyAction(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { decodedToken, error: authError } = await verifyServerActionAuth(['landlord']);
  if (authError) {
    return { error: authError.error };
  }
  const userId = decodedToken.uid;
  
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
    const publicUrl = `/placeholders/apartment${Math.floor(Math.random() * 2) + 1}.png`;

    const createdProperty = await propertyService.createPropertyWithUnits(validatedData, userId, publicUrl);
    
    revalidatePath('/properties');
    revalidatePath('/dashboard');
    revalidatePath('/');
    
    return { success: true, propertyId: createdProperty.id };

  } catch (error: any) {
    console.error('[PROPERTY_CREATE_ACTION_ERROR]', error);
    return { error: `Internal Server Error: ${error.message}` };
  }
}
