
import admin from 'firebase-admin';
import { firebaseConfig } from '@/config/firebase-config';
import fs from 'fs';
import path from 'path';

let isFirebaseAdminInitialized = false;

if (admin.apps.length > 0) {
  isFirebaseAdminInitialized = true;
} else {
  try {
    let serviceAccount;
    // For production/deployment, use the base64 environment variable
    if (process.env.NODE_ENV === 'production' && process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64) {
        serviceAccount = JSON.parse(Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64, 'base64').toString('utf8'));
    } else {
        // For local development, read the file directly
        const serviceAccountPath = path.resolve(process.cwd(), 'service-account.json');
        if (fs.existsSync(serviceAccountPath)) {
            serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        }
    }

    if (!serviceAccount) {
      throw new Error("Firebase Admin credentials not found. For local development, ensure 'service-account.json' is in the root. For production, set 'GOOGLE_APPLICATION_CREDENTIALS_BASE64'.");
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
    });

    isFirebaseAdminInitialized = true;
    console.log('[FIREBASE_ADMIN] Initialized successfully.');

  } catch (e: unknown) {
    const typedError = e as Error;
    console.error('[FIREBASE_ADMIN] CRITICAL: Failed to initialize. SDK not initialized.', typedError.message);
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
