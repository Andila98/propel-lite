'use server';

import { supabase } from '@/lib/supabase-client';

/**
 * Uploads a file buffer to Supabase Storage and returns its public URL.
 * @param fileBuffer The file content as an ArrayBuffer.
 * @param fileName The name to save the file as in the bucket.
 * @param contentType The MIME type of the file.
 * @returns The public URL of the uploaded file.
 */
export async function uploadToSupabase(
    fileBuffer: ArrayBuffer,
    fileName: string,
    contentType: string,
    bucket = 'property-images'
): Promise<string> {
    try {
      console.log('[DEBUG] Starting Supabase upload:', { fileName, contentType, bucket });
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, fileBuffer, {
          contentType,
          upsert: true, // Allow overwriting existing files
          cacheControl: '3600' // Cache for 1 hour
        });

      if (error) {
        console.error('[ERROR] Supabase upload error:', error);
        throw new Error(`Supabase upload failed: ${error.message}`);
      }

      console.log('[DEBUG] Upload successful:', data);

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      console.log('[DEBUG] Public URL generated:', publicUrl);
      return publicUrl;
      
    } catch (error: unknown) {
      console.error('[ERROR] Upload function failed:', error);
      throw error;
    }
}
