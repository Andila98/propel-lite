import * as admin from 'firebase-admin';

export let isFirebaseAdminInitialized = false;

try {
  if (!admin.apps.length) {
    // Always use production Firebase (even in development)
    // Emulators don't work well in Cloud Workstations
    
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      // Use service account for server-side
      const serviceAccount = JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT_KEY
      );
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      
      console.log('[Firebase Admin] Initialized with service account');
    } else {
      // Fallback: use default credentials (works in some cloud environments)
      admin.initializeApp();
      console.log('[Firebase Admin] Initialized with default credentials');
    }
    
    isFirebaseAdminInitialized = true;
  } else {
    isFirebaseAdminInitialized = true;
  }
} catch (error) {
  console.error('[Firebase Admin] Initialization failed:', error);
  isFirebaseAdminInitialized = false;
}

export const auth = admin.auth();
export const firestore = admin.firestore();
export const storage = isFirebaseAdminInitialized ? admin.storage() : {} as admin.storage.Storage;
