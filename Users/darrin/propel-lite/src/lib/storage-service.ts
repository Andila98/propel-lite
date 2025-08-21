
'use server';
import { storage } from '@/lib/firebase-admin'; // Use the initialized admin storage
import { v4 as uuidv4 } from 'uuid';
import { isFirebaseAdminInitialized } from './firebase-admin';

export async function uploadFile(file: File): Promise<string> {
    if (!isFirebaseAdminInitialized || !storage) {
        throw new Error("Storage service is not configured. Please check server credentials.");
    }
    
    const bucket = storage.bucket();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const destination = `properties/${fileName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const blob = bucket.file(destination);
    const blobStream = blob.createWriteStream({
        metadata: {
            contentType: file.type,
        },
    });

    return new Promise((resolve, reject) => {
        blobStream.on('error', (err) => {
            reject(`Storage upload failed: ${err.message}`);
        });

        blobStream.on('finish', async () => {
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
            await blob.makePublic(); // Make the file publicly accessible
            resolve(publicUrl);
        });

        blobStream.end(buffer);
    });
}
