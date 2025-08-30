
import admin from 'firebase-admin';
import { firebaseConfig } from '@/config/firebase-config';

let isFirebaseAdminInitialized = admin.apps.length > 0;

if (!isFirebaseAdminInitialized) {
  try {
    // This is the recommended way for production environments like Firebase Studio
    const serviceAccountString = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64
      ? Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64, 'base64').toString('utf-8')
      : null;

    if (serviceAccountString) {
      const serviceAccount = JSON.parse(serviceAccountString);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: firebaseConfig.projectId,
        storageBucket: firebaseConfig.storageBucket,
      });
      isFirebaseAdminInitialized = true;
      console.log('[FIREBASE_ADMIN] Initialized successfully from GOOGLE_APPLICATION_CREDENTIALS_BASE64.');
    } else {
      // For local development, it can fall back to Application Default Credentials
      // This uses the credentials set by `gcloud auth application-default login`
      console.log('[FIREBASE_ADMIN] GOOGLE_APPLICATION_CREDENTIALS_BASE64 not found. Attempting to use Application Default Credentials.');
      admin.initializeApp({
        projectId: firebaseConfig.projectId,
        storageBucket: firebaseConfig.storageBucket,
      });
      isFirebaseAdminInitialized = true;
      console.log('[FIREBASE_ADMIN] Initialized successfully using Application Default Credentials.');
    }
  } catch (e: any) {
    console.error('[FIREBASE_ADMIN] CRITICAL: Failed to initialize Firebase Admin SDK:', e.message);
    isFirebaseAdminInitialized = false;
  }
}


// Conditionally export services. If initialization fails, these will be undefined,
// and any code using them should handle this gracefully.
let firestore: admin.firestore.Firestore;
let auth: admin.auth.Auth;
let storage: admin.storage.Storage;

if (isFirebaseAdminInitialized) {
    firestore = admin.firestore();
    auth = admin.auth();
    storage = admin.storage();
} else {
    console.error("[FIREBASE_ADMIN] SDK NOT INITIALIZED. Server-side Firebase services will not be available.");
}


export { admin, firestore, auth, storage, isFirebaseAdminInitialized };
