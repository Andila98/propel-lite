
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

const firestore: admin.firestore.Firestore = isFirebaseAdminInitialized ? admin.firestore() : null as any;
const auth: admin.auth.Auth = isFirebaseAdminInitialized ? admin.auth() : null as any;
const storage: admin.storage.Storage = isFirebaseAdminInitialized ? admin.storage() : null as any;


export { admin, firestore, auth, storage, isFirebaseAdminInitialized };
