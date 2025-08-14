
import * as admin from 'firebase-admin';

const serviceAccount: admin.ServiceAccount = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
  // Only attempt to initialize if the private key is provided.
  // This is crucial for preventing crashes in environments where the key isn't set.
  if (serviceAccount.privateKey && serviceAccount.clientEmail && serviceAccount.projectId) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: `https://${serviceAccount.projectId}.firebaseio.com`,
        });
        console.log('Firebase Admin SDK initialized successfully.');
      } catch (error: any) {
        console.error('Firebase Admin SDK initialization error:', error.stack);
      }
  } else {
    console.warn("Firebase Admin SDK not initialized: One or more required environment variables (FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, NEXT_PUBLIC_FIREBASE_PROJECT_ID) are not set.");
  }
}


const db = admin.firestore();

export { admin, db };
