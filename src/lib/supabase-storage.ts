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
    contentType: string
): Promise<string> {
    const bucketName = 'public-uploads';

    const { data, error } = await supabase
        .storage
        .from(bucketName)
        .upload(fileName, fileBuffer, {
            contentType: contentType,
            upsert: true, // Overwrite file if it exists
        });

    if (error) {
        console.error('[SUPABASE_STORAGE_ERROR]', error);
        throw new Error(`Supabase upload failed: ${error.message}`);
    }

    // After uploading, get the public URL for the file.
    const { data: { publicUrl } } = supabase
        .storage
        .from(bucketName)
        .getPublicUrl(data.path);

    if (!publicUrl) {
        throw new Error("Could not retrieve public URL for the uploaded file.");
    }
    
    return publicUrl;
}
