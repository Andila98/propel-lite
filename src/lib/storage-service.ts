
'use server';

import { storage, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { v4 as uuidv4 } from 'uuid';

/**
 * Uploads a file to Firebase Storage and returns its public URL.
 * @param arrayBuffer The raw data of the file as an ArrayBuffer.
 * @param contentType The MIME type of the file (e.g., 'image/png').
 * @param fileName The name to save the file as in the bucket.
 * @param metadata Custom metadata to attach to the file.
 * @returns The public URL of the uploaded file.
 */
export async function uploadFile(
    arrayBuffer: ArrayBuffer, 
    contentType: string, 
    fileName: string,
    metadata: Record<string, string> = {}
): Promise<string> {
    if (!isFirebaseAdminInitialized) {
        throw new Error("Storage service is not configured. Firebase Admin SDK not initialized.");
    }
    
    try {
        const bucket = storage.bucket(); // Get default bucket
        const file = bucket.file(fileName);

        // Convert ArrayBuffer to Buffer for Node.js environment
        const buffer = Buffer.from(arrayBuffer);

        await file.save(buffer, {
            metadata: {
                contentType: contentType,
                metadata: metadata, // Custom metadata object
                // Make the file publicly readable
                cacheControl: 'public, max-age=31536000',
            },
            public: true, // This makes the file publicly accessible
            validation: 'md5' // Ensures data integrity
        });

        // Manually construct the public URL for better reliability.
        // This is the standard format for public objects in Google Cloud Storage.
        return `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    } catch (error: any) {
        console.error('[STORAGE_SERVICE_ERROR]', error);
        
        // Pass along specific storage error codes if they exist
        const newError = new Error(error.message || 'An unknown error occurred during file upload.');
        if (error.code) {
            (newError as any).code = `storage/${error.code.toLowerCase()}`;
        }
        
        throw newError;
    }
}
