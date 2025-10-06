
import admin from 'firebase-admin';
import { firebaseConfig } from '@/config/firebase-config';
import fs from 'fs';
import path from 'path';

let isFirebaseAdminInitialized = false;

function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    isFirebaseAdminInitialized = true;
    console.log('[FIREBASE_ADMIN] Already initialized.');
    return;
  }

  try {
    let credential;

    // Method 1: GOOGLE_APPLICATION_CREDENTIALS environment variable (points to a file path)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log('[FIREBASE_ADMIN] Initializing with GOOGLE_APPLICATION_CREDENTIALS file path.');
      credential = admin.credential.applicationDefault();
    } 
    // Method 2: GOOGLE_APPLICATION_CREDENTIALS_BASE64 environment variable (for production/deployment)
    else if (process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64) {
      console.log('[FIREBASE_ADMIN] Initializing with GOOGLE_APPLICATION_CREDENTIALS_BASE64 env var.');
      const serviceAccountStr = Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64, 'base64').toString('utf8');
      const serviceAccount = JSON.parse(serviceAccountStr);
      credential = admin.credential.cert(serviceAccount);
    } 
    // Method 3: Local service-account.json file (for local development)
    else {
      const serviceAccountPath = path.resolve(process.cwd(), 'service-account.json');
      if (fs.existsSync(serviceAccountPath)) {
        console.log('[FIREBASE_ADMIN] Initializing with local service-account.json file.');
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        credential = admin.credential.cert(serviceAccount);
      }
    }

    if (!credential) {
      throw new Error(
        "Firebase Admin credentials not found. Please take one of the following actions:\n" +
        "1. (Recommended for Vercel/production) Set the GOOGLE_APPLICATION_CREDENTIALS_BASE64 environment variable.\n" +
        "2. (For local development) Place your service-account.json file in the root of your project."
      );
    }

    admin.initializeApp({
      credential,
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
    });

    isFirebaseAdminInitialized = true;
    console.log('[FIREBASE_ADMIN] Initialized successfully.');

  } catch (e: unknown) {
    const typedError = e as Error;
    console.error('[FIREBASE_ADMIN] CRITICAL: Failed to initialize. Server-side Firebase services will not be available.', {
        message: typedError.message,
        stack: process.env.NODE_ENV === 'development' ? typedError.stack : undefined
    });
    isFirebaseAdminInitialized = false;
  }
}

// Initialize on load
initializeFirebaseAdmin();

// Export services, but they might be uninitialized if setup failed.
const firestore: admin.firestore.Firestore = isFirebaseAdminInitialized ? admin.firestore() : {} as admin.firestore.Firestore;
const auth: admin.auth.Auth = isFirebaseAdminInitialized ? admin.auth() : {} as admin.auth.Auth;
const storage: admin.storage.Storage = isFirebaseAdminInitialized ? admin.storage() : {} as admin.storage.Storage;

if (!isFirebaseAdminInitialized) {
  console.error("[FIREBASE_ADMIN] SDK IS NOT INITIALIZED. Any server-side calls to Firebase will fail.");
}

export { admin, firestore, auth, storage, isFirebaseAdminInitialized };
