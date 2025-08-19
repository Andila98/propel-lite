
import admin from 'firebase-admin';

let isFirebaseAdminInitialized = admin.apps.length > 0;

if (!isFirebaseAdminInitialized) {
  try {
    const serviceAccount = JSON.parse(
      Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64 || '', 'base64').toString('ascii')
    );
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
    isFirebaseAdminInitialized = true;
    console.log('[FIREBASE_ADMIN] Initialized successfully.');
  } catch (error: any) {
    console.error('[FIREBASE_ADMIN] Failed to initialize:', error.message);
    // Don't throw here, as some parts of the app might not require the admin SDK.
    // The flag `isFirebaseAdminInitialized` will be used to check if features are available.
  }
}

const firestore = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();

export { admin, firestore, auth, storage, isFirebaseAdminInitialized };
