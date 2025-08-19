
'use server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function uploadFile(file: File): Promise<string> {
    const fileExtension = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('properties') // your bucket name
        .upload(fileName, file, {
            contentType: file.type,
            upsert: true,
        });

    if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
        .from('properties')
        .getPublicUrl(uploadData.path);
        
    return urlData.publicUrl;
}
