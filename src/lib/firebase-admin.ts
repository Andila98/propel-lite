
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
      console.log('[FIREBASE_ADMIN] Initialized successfully from Base64 environment variable.');
    } else if (process.env.NODE_ENV === 'development') {
      // For local development, try to use Application Default Credentials
      // This works if you've run `gcloud auth application-default login`
      // or if you're running on a GCP environment (like Cloud Shell)
      console.log('[FIREBASE_ADMIN] No Base64 credentials found. Attempting to use Application Default Credentials for development.');
      admin.initializeApp();
      isFirebaseAdminInitialized = true;
      console.log('[FIREBASE_ADMIN] Initialized successfully using Application Default Credentials.');
    } else {
        // This is a critical error for a production environment if credentials aren't set
        throw new Error("Firebase Admin SDK credentials not found in production environment. Set GOOGLE_APPLICATION_CREDENTIALS_BASE64.");
    }
  } catch (error: any) {
    console.error('[FIREBASE_ADMIN] Failed to initialize:', error.message);
    // Don't re-throw in a way that crashes the whole app start, 
    // but ensure features that need it will fail gracefully.
    // The isFirebaseAdminInitialized flag will remain false.
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
    console.warn("[FIREBASE_ADMIN] SDK not initialized. Server-side Firebase services will not be available.");
}


export { admin, firestore, auth, storage, isFirebaseAdminInitialized };
