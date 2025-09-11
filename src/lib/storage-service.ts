
'use server';

import { supabase } from '@/lib/supabase-client';

/**
 * Uploads a file to Supabase Storage and returns its public URL.
 * @param arrayBuffer The raw data of the file as an ArrayBuffer.
 * @param contentType The MIME type of the file (e.g., 'image/png').
 * @param fileName The name to save the file as in the bucket.
 * @param metadata Custom metadata to attach to the file (note: Supabase has limited metadata support compared to Firebase).
 * @returns The public URL of the uploaded file.
 */
export async function uploadFile(
    arrayBuffer: ArrayBuffer, 
    contentType: string, 
    fileName: string,
    metadata: Record<string, string> = {}
): Promise<string> {

    const file = new File([arrayBuffer], fileName, { type: contentType });

    // For this app, we'll assume a single public bucket named 'public-uploads'
    // You must create this bucket in your Supabase project dashboard and set it to be public.
    const bucketName = 'public-uploads';

    const { data, error } = await supabase
        .storage
        .from(bucketName)
        .upload(fileName, file, {
            contentType,
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
