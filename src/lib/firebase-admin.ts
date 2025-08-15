
import * as admin from 'firebase-admin';
import { authConfig } from '@/config/server-config';

if (!admin.apps.length) {
  // Only attempt to initialize if the service account details are provided.
  // This is crucial for preventing crashes in environments where the keys aren't set.
  if (authConfig.serviceAccount.privateKey && authConfig.serviceAccount.clientEmail && authConfig.serviceAccount.projectId) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert(authConfig.serviceAccount),
          databaseURL: `https://${authConfig.serviceAccount.projectId}.firebaseio.com`,
        });
        console.log('[FIREBASE_ADMIN] SDK initialized successfully.');
      } catch (error: any) {
        console.error('[FIREBASE_ADMIN] SDK initialization error:', error.stack);
      }
  } else {
    console.warn("[FIREBASE_ADMIN] SDK not initialized: One or more required environment variables (FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, NEXT_PUBLIC_FIREBASE_PROJECT_ID) are not set.");
  }
}

const db = admin.firestore();

export { admin, db };
