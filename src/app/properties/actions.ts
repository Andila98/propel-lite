
"use server";

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { propertyService } from '@/services/property-service';
import { verifyServerActionAuth } from '@/lib/server-utils';
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
  const { decodedToken, error: authError } = await verifyServerActionAuth(['landlord']);
  if (authError) {
    return { error: authError.error };
  }
  const userId = decodedToken.uid;
  
  const propertyDataString = formData.get('propertyData') as string | null;
  const file = formData.get('media') as File | null;

  if (!file || file.size === 0) {
      return { error: 'An image file is required.' };
  }
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
      const firstError = Object.values(validationResult.error.flatten().fieldErrors)[0]?.[0];
      return { error: `Invalid property data: ${firstError}` };
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
    revalidatePath('/');
    
    return { success: true, propertyId: createdProperty.id };

  } catch (error: any) {
    console.error('[PROPERTY_CREATE_ACTION_ERROR]', error);
    // In a real app, you might want to delete the uploaded file here if the DB operation fails
    return { error: `Internal Server Error: ${error.message}` };
  }
}
