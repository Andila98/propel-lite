
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
        console.warn('[FIREBASE_ADMIN] Service account credentials not found. Server-side features relying on Firebase will be disabled.');
    }
  } catch (error: any) {
    console.error('[FIREBASE_ADMIN] Failed to initialize:', error.message);
  }
}

// Use a function to get the services, ensuring they are only accessed if initialized.
const getFirestore = () => {
    if (!isFirebaseAdminInitialized) throw new Error("Firebase Admin not initialized.");
    return admin.firestore();
}

const getAuth = () => {
    if (!isFirebaseAdminInitialized) throw new Error("Firebase Admin not initialized.");
    return admin.auth();
}

const getStorage = () => {
    if (!isFirebaseAdminInitialized) throw new Error("Firebase Admin not initialized.");
    return admin.storage();
}

export { admin, getFirestore, getAuth, getStorage, isFirebaseAdminInitialized };
export const firestore = isFirebaseAdminInitialized ? getFirestore() : null as unknown as admin.firestore.Firestore;
export const auth = isFirebaseAdminInitialized ? getAuth() : null as unknown as admin.auth.Auth;
export const storage = isFirebaseAdminInitialized ? getStorage() : null as unknown as admin.storage.Storage;
