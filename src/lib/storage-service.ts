
'use server';

import { storage } from '@/lib/firebase-admin';
import { v4 as uuidv4 } from 'uuid';

const BUCKET_NAME = process.env.FIREBASE_STORAGE_BUCKET;

if (!BUCKET_NAME) {
    console.warn("[STORAGE_SERVICE] FIREBASE_STORAGE_BUCKET environment variable not set. File uploads will fail.");
}

/**
 * Uploads a file to Firebase Cloud Storage and returns its public URL.
 * @param arrayBuffer The raw data of the file as an ArrayBuffer.
 * @param contentType The MIME type of the file (e.g., 'image/png').
 * @param fileName The original name of the file, used to get the extension.
 * @returns The public URL of the uploaded file.
 */
export async function uploadFile(arrayBuffer: ArrayBuffer, contentType: string, fileName: string): Promise<string> {
    if (!BUCKET_NAME) {
        throw new Error("Storage service is not configured. Missing bucket name.");
    }
    
    const bucket = storage.bucket(BUCKET_NAME);
    const fileExtension = fileName.split('.').pop() || '';
    const newFileName = `${uuidv4()}.${fileExtension}`;
    const file = bucket.file(newFileName);

    // Convert ArrayBuffer to Buffer for Firebase Admin SDK
    const buffer = Buffer.from(arrayBuffer);

    await file.save(buffer, {
        metadata: {
            contentType: contentType,
        },
        public: true, // Make the file publicly readable
    });
    
    // The public URL format for Firebase Storage is predictable
    return `https://storage.googleapis.com/${BUCKET_NAME}/${newFileName}`;
}
