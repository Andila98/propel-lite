
import admin from 'firebase-admin';
import { firebaseConfig } from '@/config/firebase-config';

let isFirebaseAdminInitialized = false;

if (admin.apps.length > 0) {
  isFirebaseAdminInitialized = true;
} else {
  const serviceAccountString = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64;

  if (serviceAccountString) {
    try {
      const serviceAccount = JSON.parse(Buffer.from(serviceAccountString, 'base64').toString('utf-8'));
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: firebaseConfig.projectId,
        storageBucket: firebaseConfig.storageBucket,
      });

      isFirebaseAdminInitialized = true;
      console.log('[FIREBASE_ADMIN] Initialized successfully.');

    } catch (e: any) {
      console.error('[FIREBASE_ADMIN] CRITICAL: Failed to parse service account credentials. SDK not initialized.', e.message);
    }
  } else {
    console.error('[FIREBASE_ADMIN] CRITICAL: GOOGLE_APPLICATION_CREDENTIALS_BASE64 environment variable not set. Firebase Admin SDK cannot be initialized.');
  }
}

let firestore: admin.firestore.Firestore;
let auth: admin.auth.Auth;
let storage: admin.storage.Storage;

if (isFirebaseAdminInitialized) {
  firestore = admin.firestore();
  auth = admin.auth();
  storage = admin.storage();
} else {
  // To prevent the app from crashing entirely if the SDK fails to initialize,
  // we can use a proxy or a mock, but for now, we'll log a severe warning.
  // Any part of the app calling these services will fail at runtime.
  console.error("[FIREBASE_ADMIN] SDK NOT INITIALIZED. Server-side Firebase services are unavailable.");
  // Provide dummy objects to prevent crashes on import, though methods will fail.
  firestore = {} as admin.firestore.Firestore;
  auth = {} as admin.auth.Auth;
  storage = {} as admin.storage.Storage;
}

export { admin, firestore, auth, storage, isFirebaseAdminInitialized };
