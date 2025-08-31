
'use server';

import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseBucket = process.env.SUPABASE_BUCKET_NAME;

if (!supabaseUrl || !supabaseKey || !supabaseBucket) {
    console.warn("[STORAGE_SERVICE] Supabase environment variables not set. File uploads will fail.");
}

const supabase = createClient(supabaseUrl!, supabaseKey!);

/**
 * Uploads a file to Supabase Storage and returns its public URL.
 * @param arrayBuffer The raw data of the file as an ArrayBuffer.
 * @param contentType The MIME type of the file (e.g., 'image/png').
 * @param fileName The original name of the file, used to get the extension.
 * @returns The public URL of the uploaded file.
 */
export async function uploadFile(arrayBuffer: ArrayBuffer, contentType: string, fileName: string): Promise<string> {
    if (!supabaseUrl || !supabaseKey || !supabaseBucket) {
        throw new Error("Storage service is not configured. Missing Supabase credentials.");
    }
    
    try {
        const fileExtension = fileName.split('.').pop() || '';
        const newFileName = `${uuidv4()}.${fileExtension}`;
        
        // Convert ArrayBuffer to Buffer for Supabase server-side upload
        const buffer = Buffer.from(arrayBuffer);

        const { data, error } = await supabase.storage
            .from(supabaseBucket)
            .upload(newFileName, buffer, {
                contentType: contentType,
                upsert: false, // Don't overwrite existing files
            });

        if (error) {
            console.error('[SUPABASE_UPLOAD_ERROR]', error);
            throw new Error(`Supabase upload failed: ${error.message}`);
        }

        const { data: publicUrlData } = supabase.storage
            .from(supabaseBucket)
            .getPublicUrl(data.path);

        return publicUrlData.publicUrl;
    } catch (error: any) {
        console.error('[UPLOAD_FILE_ERROR]', error);
        throw new Error(error.message || 'An unknown error occurred during file upload.');
    }
}
