
import * as admin from 'firebase-admin';
import { authConfig } from '@/config/server-config';

let isInitialized = admin.apps.length > 0;

if (!isInitialized) {
  // Only attempt to initialize if the service account details are provided.
  // This is crucial for preventing crashes in environments where the keys aren't set.
  const canInitialize = authConfig.serviceAccount.privateKey && 
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
        console.error('[FIREBASE_ADMIN] SDK initialization error:', error.stack);
      }
  } else {
    console.warn("[FIREBASE_ADMIN] SDK not initialized: Required environment variables for the service account are not set. Server-side Firebase features will be disabled.");
  }
}

const db = isInitialized ? admin.firestore() : null;
const auth = isInitialized ? admin.auth() : null;

// A helper function to ensure db is not null when used.
function getDb() {
    if (!db) {
        throw new Error("Firestore is not initialized. Please check your server environment variables.");
    }
    return db;
}

export { admin, getDb as db, auth, isInitialized as isFirebaseAdminInitialized };
