
import admin from 'firebase-admin';
import { getApps, initializeApp, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// This file initializes the Firebase Admin SDK, which is used for all backend (server-side) operations.

/**
 * Initializes and returns the Firebase Admin app instance.
 *
 * It uses a singleton pattern to ensure that Firebase is initialized only once.
 * For local development, it initializes using the service account details from environment variables.
 * For production (on Google Cloud), it uses Application Default Credentials.
 */
function initializeAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // When running locally or in a deployed environment, the SDK will use the
  // service account credentials provided through environment variables.
  const serviceAccount = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  };

  return initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

const adminApp = initializeAdminApp();
const db = getFirestore(adminApp);
const bucket = getStorage(adminApp).bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);

export { db, bucket, admin };
