
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
        storageBucket: `${serviceAccount.project_id}.appspot.com`, // Explicitly set storage bucket
      });
      isFirebaseAdminInitialized = true;
      console.log('[FIREBASE_ADMIN] Initialized successfully from environment variable.');
    } else {
      // This is a critical failure. The app cannot run without credentials.
      throw new Error("Firebase Admin SDK credentials are not available. Set the GOOGLE_APPLICATION_CREDENTIALS_BASE64 environment variable.");
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
