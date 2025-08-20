
import admin from 'firebase-admin';

let isFirebaseAdminInitialized = admin.apps.length > 0;

if (!isFirebaseAdminInitialized) {
  try {
    const serviceAccountString = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64 
      ? Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64, 'base64').toString('ascii')
      : null;

    if (serviceAccountString) {
      const serviceAccount = JSON.parse(serviceAccountString);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });
      isFirebaseAdminInitialized = true;
    }
  } catch (error: any) {
  }
}

const firestore = isFirebaseAdminInitialized ? admin.firestore() : null as unknown as admin.firestore.Firestore;
const auth = isFirebaseAdminInitialized ? admin.auth() : null as unknown as admin.auth.Auth;
const storage = isFirebaseAdminInitialized ? admin.storage() : null as unknown as admin.storage.Storage;

export { admin, firestore, auth, storage, isFirebaseAdminInitialized };
