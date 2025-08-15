
import * as admin from 'firebase-admin';
import { authConfig } from '@/config/server-config';

let isInitialized = admin.apps.length > 0;

if (!isInitialized) {
  // Only attempt to initialize if the service account details are provided.
  // This is a critical check to prevent crashes in environments where keys aren't set.
  const canInitialize = 
    authConfig.serviceAccount.privateKey && 
    authConfig.serviceAccount.clientEmail && 
    authConfig.serviceAccount.projectId;

  if (canInitialize) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert(authConfig.serviceAccount),
          databaseURL: `https://${authConfig.serviceAccount.projectId}.firebaseio.com`,
        });
        isInitialized = true;
        console.log('[FIREBASE_ADMIN] SDK initialized successfully.');
      } catch (error: any) {
        console.error('[FIREBASE_ADMIN] SDK initialization error. Please check your service account credentials.', error.stack);
        // Do not re-throw; allow the app to run with server features disabled.
      }
  } else {
    console.warn("[FIREBASE_ADMIN] SDK not initialized: Required environment variables for the service account are not set. Server-side Firebase features will be disabled.");
  }
}

// Export a getter for the db and auth services to ensure they are only accessed when initialized.
// This prevents the application from crashing if the initialization fails.
const db = () => {
    if (!isInitialized) throw new Error("Firebase Admin SDK not initialized.");
    return admin.firestore();
};

const auth = () => {
    if (!isInitialized) throw new Error("Firebase Admin SDK not initialized.");
    return admin.auth();
}


export { admin, db, auth, isInitialized as isFirebaseAdminInitialized };
