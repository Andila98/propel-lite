
'use server';

import { supabase } from '@/lib/supabase-client';

/**
 * Uploads a file to Supabase Storage and returns its public URL.
 * @param file The file object to upload.
 * @param fileName The name to save the file as in the bucket.
 * @returns The public URL of the uploaded file.
 */
export async function uploadFile(
    file: File,
    fileName: string
): Promise<string> {
    // For this app, we'll assume a single public bucket named 'public-uploads'
    // You must create this bucket in your Supabase project dashboard and set it to be public.
    const bucketName = 'public-uploads';

    const { data, error } = await supabase
        .storage
        .from(bucketName)
        .upload(fileName, file, {
            contentType: file.type,
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
