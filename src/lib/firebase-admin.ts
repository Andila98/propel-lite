
import admin from 'firebase-admin';
import { firebaseConfig } from '@/config/firebase-config';
import * as serviceAccount from '../../service-account.json';

let isFirebaseAdminInitialized = false;

if (admin.apps.length > 0) {
  isFirebaseAdminInitialized = true;
} else {
  try {
    // Directly use the imported service account object
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
    });

    isFirebaseAdminInitialized = true;
    console.log('[FIREBASE_ADMIN] Initialized successfully from service-account.json.');

  } catch (e: unknown) {
    const typedError = e as Error;
    console.error('[FIREBASE_ADMIN] CRITICAL: Failed to initialize from service-account.json. SDK not initialized.', typedError.message);
  }
}

console.log('Firebase Admin initialized:', isFirebaseAdminInitialized);

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
