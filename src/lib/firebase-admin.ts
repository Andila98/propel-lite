
import * as admin from 'firebase-admin';
import { authConfig } from '@/config/server-config';

// Check if all necessary service account details are present.
const hasCredentials = 
    authConfig.serviceAccount.projectId &&
    authConfig.serviceAccount.clientEmail &&
    authConfig.serviceAccount.privateKey;

if (!admin.apps.length) {
    if (hasCredentials) {
        try {
            admin.initializeApp({
                credential: admin.credential.cert(authConfig.serviceAccount),
            });
            console.log('[FIREBASE_ADMIN] Initialized successfully.');
        } catch (error: any) {
            console.error('[FIREBASE_ADMIN_INIT_ERROR] Failed to initialize Firebase Admin SDK:', {
                message: error.message,
                // Do not log the full error in production as it might contain sensitive details.
                code: error.code,
            });
        }
    } else {
        console.warn('[FIREBASE_ADMIN] Service account credentials are not fully configured in environment variables. Admin SDK not initialized.');
    }
}

// Conditionally export the services only if the app has been initialized.
const appInitialized = admin.apps.length > 0;

export const auth = appInitialized ? admin.auth() : {} as admin.auth.Auth;
export const firestore = appInitialized ? admin.firestore() : {} as admin.firestore.Firestore;
export { admin };
