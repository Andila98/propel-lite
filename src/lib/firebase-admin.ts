
import * as admin from 'firebase-admin';

// The Firebase Admin SDK will automatically detect the service account file
// from the GOOGLE_APPLICATION_CREDENTIALS environment variable.
if (!admin.apps.length) {
    try {
        admin.initializeApp();
        console.log('[FIREBASE_ADMIN] Initialized successfully via Application Default Credentials.');
    } catch (error: any) {
        console.error('[FIREBASE_ADMIN_INIT_ERROR] Failed to initialize Firebase Admin SDK:', {
            message: error.message,
            code: error.code,
        });
        // This will often fail if the GOOGLE_APPLICATION_CREDENTIALS env var is not set
        // or the file it points to is incorrect.
        console.error("Please ensure the GOOGLE_APPLICATION_CREDENTIALS environment variable is set correctly.");
    }
}

// Conditionally export the services only if the app has been initialized.
const appInitialized = admin.apps.length > 0;

export const auth = appInitialized ? admin.auth() : {} as admin.auth.Auth;
export const firestore = appInitialized ? admin.firestore() : {} as admin.firestore.Firestore;
export { admin };
