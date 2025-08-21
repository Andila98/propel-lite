
'use server';

import { storage } from './firebase-admin';
import { v4 as uuidv4 } from 'uuid';

export async function uploadFile(file: File): Promise<string> {
    const bucket = storage.bucket();
    const fileName = `${uuidv4()}-${file.name}`;
    const fileUpload = bucket.file(fileName);

    const blobStream = fileUpload.createWriteStream({
        metadata: {
            contentType: file.type,
        },
    });

    const buffer = Buffer.from(await file.arrayBuffer());

    return new Promise((resolve, reject) => {
        blobStream.on('error', (error) => {
            console.error('[STORAGE_SERVICE_ERROR] Blob stream error:', error);
            reject(`Unable to upload file: ${error.message}`);
        });

        blobStream.on('finish', async () => {
            try {
                // Make the file public
                await fileUpload.makePublic();
                
                // Get the public URL
                const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
                resolve(publicUrl);

            } catch (error: any) {
                 console.error('[STORAGE_SERVICE_ERROR] Failed to make file public:', error);
                 reject(`Failed to get public URL: ${error.message}`);
            }
        });
        
        blobStream.end(buffer);
    });
}
