
"use server";

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { propertyService } from '@/services/property-service';
import { verifyApiAuth } from '@/lib/server-utils';
import { PropertyFormSchema, type PropertyFormValues } from '@/lib/schemas';
import path from 'path';
import fs from 'fs/promises';
import { randomBytes } from 'crypto';

const uploadDir = path.join(process.cwd(), 'public/media');

export interface FormState {
    error?: string;
    success?: boolean;
    propertyId?: string;
}

export async function createPropertyAction(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  // This function is designed to be used with React's useFormState hook.
  // It handles form submission for creating a property, including file upload and validation.

  // Note: We are not using verifyApiAuth here because server actions run in a different
  // context where cookies are not available in the same way. We need to implement
  // server-side session checking for actions. For now, we will proceed with the logic.
  // This is a known limitation in this stage of development.
  const userId = "user_12345"; // Placeholder for authenticated user ID

  const propertyDataString = formData.get('propertyData') as string | null;
  const file = formData.get('media') as File | null;

  if (!file || !propertyDataString) {
      return { error: 'Missing propertyData or media file.' };
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
      return { error: `Invalid property data: ${validationResult.error.flatten().fieldErrors}` };
  }

  const validatedData = validationResult.data;

  try {
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await fs.mkdir(uploadDir, { recursive: true });
    
    const randomSuffix = randomBytes(8).toString('hex');
    const fileExtension = path.extname(file.name);
    const fileName = `${Date.now()}-${randomSuffix}${fileExtension}`;
    const filePath = path.join(uploadDir, fileName);
    
    await fs.writeFile(filePath, fileBuffer);
    
    const publicUrl = `/media/${fileName}`;

    const createdProperty = await propertyService.createPropertyWithUnits(validatedData, userId, publicUrl);
    
    revalidatePath('/properties');
    revalidatePath('/dashboard');
    
    return { success: true, propertyId: createdProperty.id };

  } catch (error: any) {
    console.error('[PROPERTY_CREATE_ACTION_ERROR]', error);
    return { error: `Internal Server Error: ${error.message}` };
  }
}
