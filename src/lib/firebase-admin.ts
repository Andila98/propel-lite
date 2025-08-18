
import * as admin from 'firebase-admin';
import serviceAccount from '../../service-account.json';

let isFirebaseAdminInitialized = false;

// This is a type assertion to satisfy the TSC compiler for the service account structure.
const typedServiceAccount = serviceAccount as admin.ServiceAccount;

// Check if the service account details are present before initializing
if (typedServiceAccount.project_id) {
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
} else {
    console.warn("[FIREBASE_ADMIN_WARN] Service account credentials are missing or incomplete in service-account.json. Firebase Admin SDK not initialized.");
}

export { admin, isFirebaseAdminInitialized };
