
import * as admin from 'firebase-admin';

let isFirebaseAdminInitialized = false;

if (!admin.apps.length) {
    try {
        const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        if (!serviceAccountPath) {
            console.warn('[FIREBASE_ADMIN] GOOGLE_APPLICATION_CREDENTIALS environment variable not set. Firebase Admin SDK will not be initialized.');
        } else {
             admin.initializeApp({
                credential: admin.credential.cert(serviceAccountPath),
            });
            console.log('[FIREBASE_ADMIN] Initialized successfully via Application Default Credentials.');
            isFirebaseAdminInitialized = true;
        }
    } catch (error: any) {
        console.error('[FIREBASE_ADMIN_INIT_ERROR] Failed to initialize Firebase Admin SDK:', {
            message: error.message,
            code: error.code,
        });
        console.error("Please ensure the GOOGLE_APPLICATION_CREDENTIALS environment variable is set correctly and the file is valid JSON.");
    }
} else {
    isFirebaseAdminInitialized = true;
}

// Conditionally export the services only if the app has been initialized.
const auth = isFirebaseAdminInitialized ? admin.auth() : ({} as admin.auth.Auth);
const firestore = isFirebaseAdminInitialized ? admin.firestore() : ({} as admin.firestore.Firestore);

export { admin, auth, firestore, isFirebaseAdminInitialized };
