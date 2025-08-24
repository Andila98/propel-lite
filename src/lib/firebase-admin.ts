
import admin from 'firebase-admin';

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
      console.log('[FIREBASE_ADMIN] Initialized successfully from environment variable.');
    } else {
        // This is a critical error for a production-like environment
        throw new Error("Firebase Admin SDK credentials not found. Server-side features will not work.");
    }
  } catch (error: any) {
    console.error('[FIREBASE_ADMIN] Failed to initialize:', error.message);
    // Re-throw the error to prevent the app from starting in a broken state
    throw error;
  }
}

// These will now only be exported if initialization was successful.
// If not, the error thrown above would have already stopped the process.
const firestore: admin.firestore.Firestore = admin.firestore();
const auth: admin.auth.Auth = admin.auth();
const storage: admin.storage.Storage = admin.storage();


export { admin, firestore, auth, storage, isFirebaseAdminInitialized };
