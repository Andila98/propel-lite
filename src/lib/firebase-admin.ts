
import admin from 'firebase-admin';

let isFirebaseAdminInitialized = admin.apps.length > 0;

if (!isFirebaseAdminInitialized) {
  try {
    // For local development, try to use Application Default Credentials first.
    // This works if you've run `gcloud auth application-default login`.
    admin.initializeApp();
    isFirebaseAdminInitialized = true;
    console.log('[FIREBASE_ADMIN] Initialized successfully using Application Default Credentials.');
  } catch (error: any) {
    // If ADC fails, try the environment variable method, which is ideal for production.
    console.warn('[FIREBASE_ADMIN] Application Default Credentials failed. Falling back to environment variable.');
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
            // This is a critical error if no credentials are found at all.
            throw new Error("No Firebase Admin SDK credentials found. Please either run 'gcloud auth application-default login' for local development or set the GOOGLE_APPLICATION_CREDENTIALS_BASE64 environment variable for production.");
        }
    } catch (e: any) {
         console.error('[FIREBASE_ADMIN] Failed to initialize from environment variable:', e.message);
    }
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
