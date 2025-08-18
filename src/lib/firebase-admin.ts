
import * as admin from 'firebase-admin';
import serviceAccount from '../../../service-account.json';

let isFirebaseAdminInitialized = false;

// This is a type assertion to satisfy the TSC compiler for the service account structure.
const typedServiceAccount = serviceAccount as admin.ServiceAccount;

// Check if the app is already initialized to prevent errors.
if (!admin.apps.length) {
    try {
        // Initialize the app with a certificate object
        admin.initializeApp({
            credential: admin.credential.cert(typedServiceAccount)
        });
        console.log('[FIREBASE_ADMIN] Initialized successfully via service account file.');
        isFirebaseAdminInitialized = true;
    } catch (error: any) {
        console.error('[FIREBASE_ADMIN_INIT_ERROR] Failed to initialize Firebase Admin SDK:', {
            message: error.message,
            code: error.code,
        });
        console.error("Please ensure the service-account.json file is valid.");
    }
} else {
    // App is already initialized, so we can consider it ready.
    isFirebaseAdminInitialized = true;
}


// Conditionally export the services only if the app has been initialized.
// This prevents other parts of the app from crashing if they try to use an uninitialized service.
const auth = isFirebaseAdminInitialized ? admin.auth() : ({} as admin.auth.Auth);
const firestore = isFirebaseAdminInitialized ? admin.firestore() : ({} as admin.firestore.Firestore);

export { admin, auth, firestore, isFirebaseAdminInitialized };
