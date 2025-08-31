
'use server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function uploadFile(arrayBuffer: ArrayBuffer, contentType: string, fileName: string): Promise<string> {
    const fileExtension = fileName.split('.').pop();
    const newFileName = `${uuidv4()}.${fileExtension}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('properties') // your bucket name
        .upload(newFileName, arrayBuffer, {
            contentType: contentType,
            upsert: false, // It's better to avoid upsert for new files with unique names
        });

    if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
        .from('properties')
        .getPublicUrl(uploadData.path);
            
    return urlData.publicUrl;
}
