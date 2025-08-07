
import admin from 'firebase-admin';
import { getApps, initializeApp, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { authConfig } from '@/config/server-config';

// This file initializes the Firebase Admin SDK, which is used for all backend (server-side) operations.

/**
 * Initializes and returns the Firebase Admin app instance.
 *
 * It uses a singleton pattern to ensure that Firebase is initialized only once.
 *
 * For local development, it initializes using the service account details from environment variables.
 * For production (on Google Cloud), it uses Application Default Credentials.
 */
function initializeAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // When running locally, we use the service account from the environment variables.
  // In a deployed Google Cloud environment, the SDK automatically finds the credentials.
  const credential = process.env.NODE_ENV !== 'production'
    ? admin.credential.cert(authConfig.serviceAccount)
    : admin.credential.applicationDefault();

  return initializeApp({
    credential,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

const adminApp = initializeAdminApp();
const db = getFirestore(adminApp);
const bucket = getStorage(adminApp).bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);

export { db, bucket, admin };
