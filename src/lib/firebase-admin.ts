
import * as admin from 'firebase-admin';
import 'dotenv/config';

let isFirebaseAdminInitialized = false;

// This check prevents the app from even trying to initialize if the credentials aren't set.
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Check if the app is already initialized to prevent errors.
    if (!admin.apps.length) {
        try {
            // The Admin SDK will automatically use the GOOGLE_APPLICATION_CREDENTIALS env var.
            admin.initializeApp();
            console.log('[FIREBASE_ADMIN] Initialized successfully via Application Default Credentials.');
            isFirebaseAdminInitialized = true;
        } catch (error: any) {
            console.error('[FIREBASE_ADMIN_INIT_ERROR] Failed to initialize Firebase Admin SDK:', {
                message: error.message,
                code: error.code,
            });
            console.error("Please ensure the service-account.json file is valid and the GOOGLE_APPLICATION_CREDENTIALS environment variable is set correctly.");
        }
    } else {
        // App is already initialized, so we can consider it ready.
        isFirebaseAdminInitialized = true;
    }
} else {
    console.warn('[FIREBASE_ADMIN] GOOGLE_APPLICATION_CREDENTIALS environment variable not set. Firebase Admin SDK will not be initialized.');
}


// Conditionally export the services only if the app has been initialized.
// This prevents other parts of the app from crashing if they try to use an uninitialized service.
const auth = isFirebaseAdminInitialized ? admin.auth() : ({} as admin.auth.Auth);
const firestore = isFirebaseAdminInitialized ? admin.firestore() : ({} as admin.firestore.Firestore);

export { admin, auth, firestore, isFirebaseAdminInitialized };
