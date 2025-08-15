
import * as admin from 'firebase-admin';
import { authConfig } from '@/config/server-config';

let isInitialized = admin.apps.length > 0;

if (!isInitialized) {
  // This is the single source of truth for whether the Admin SDK can be initialized.
  // It checks that all necessary parts of the service account are present in the config.
  const canInitialize = 
    authConfig.serviceAccount.privateKey && 
    authConfig.serviceAccount.clientEmail && 
    authConfig.serviceAccount.projectId;

  if (canInitialize) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert(authConfig.serviceAccount),
        });
        isInitialized = true;
        console.log('[FIREBASE_ADMIN] SDK initialized successfully.');
      } catch (error: any) {
        console.error('[FIREBASE_ADMIN] SDK initialization error:', error.message);
        // Do not re-throw; allow the app to run with server features disabled.
        // The `isInitialized` flag will remain false.
      }
  } else {
    // This warning is crucial for developers to know why server-side features are disabled.
    console.warn("[FIREBASE_ADMIN] SDK not initialized: Required environment variables for the service account are not set. Server-side Firebase features will be disabled.");
  }
}

// Export a getter for the db and auth services.
// This pattern ensures that any attempt to use a service will fail if the SDK is not initialized,
// preventing the application from crashing in unexpected ways.
const db = () => {
    if (!isInitialized) throw new Error("Firebase Admin SDK is not initialized. Check server environment variables.");
    return admin.firestore();
};

const auth = () => {
    if (!isInitialized) throw new Error("Firebase Admin SDK is not initialized. Check server environment variables.");
    return admin.auth();
}

// Export a boolean flag that other parts of the app can use to check the SDK status.
export { admin, db, auth, isInitialized as isFirebaseAdminInitialized };
