
import admin from 'firebase-admin';
import { firebaseConfig } from '@/config/firebase-config';

let isFirebaseAdminInitialized = admin.apps.length > 0;

if (!isFirebaseAdminInitialized) {
  try {
    const serviceAccountString = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64
      ? Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64, 'base64').toString('utf-8')
      : null;

    if (serviceAccountString) {
      const serviceAccount = JSON.parse(serviceAccountString);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
        storageBucket: `${serviceAccount.project_id}.appspot.com`
      });
      isFirebaseAdminInitialized = true;
      console.log('[FIREBASE_ADMIN] Initialized successfully from Base64 environment variable.');
    } else {
      // This is a critical error if no credentials are found.
      // In a local environment without the env var, we can try to fall back to default creds.
      if (process.env.NODE_ENV === 'development') {
        console.warn("[FIREBASE_ADMIN] GOOGLE_APPLICATION_CREDENTIALS_BASE64 not set. Falling back to Application Default Credentials for local development.");
        admin.initializeApp({
            projectId: firebaseConfig.projectId,
        });
        isFirebaseAdminInitialized = true;
        console.log('[FIREBASE_ADMIN] Initialized successfully using Application Default Credentials.');
      } else {
        throw new Error("No Firebase Admin SDK credentials found. Please set the GOOGLE_APPLICATION_CREDENTIALS_BASE64 environment variable for production.");
      }
    }
  } catch (e: any) {
    console.error('[FIREBASE_ADMIN] CRITICAL: Failed to initialize Firebase Admin SDK:', e.message);
    // Do not set isFirebaseAdminInitialized to true if any initialization path fails.
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
