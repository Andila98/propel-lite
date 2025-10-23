import * as admin from "firebase-admin";
import * as path from "path";
import fs from 'fs';

// This is a simplified check. In a real-world scenario, you might have more robust
// logic to handle different environments (e.g., local vs. deployed on Firebase/Vercel).
export const isFirebaseAdminInitialized = admin.apps.length > 0;

if (!isFirebaseAdminInitialized) {
  try {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(process.cwd(), "service-account.json");
    
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
       console.log("Firebase Admin SDK initialized successfully.");
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
         admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
        console.log("Firebase Admin SDK initialized from environment variable.");
    } else {
      console.warn("Firebase Admin SDK not initialized. Service account file not found and FIREBASE_SERVICE_ACCOUNT env var not set.");
    }
  } catch (error: unknown) {
    const typedError = error as Error;
    console.error("Firebase Admin SDK initialization error:", typedError.message);
  }
}

export const firestore = admin.firestore();
export const auth = admin.auth();
export default admin;
