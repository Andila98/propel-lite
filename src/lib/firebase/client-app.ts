// src/lib/firebase/client-app.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Function to initialize Firebase, ensuring config is valid.
function initializeFirebaseApp() {
    // Check for missing configuration values.
    for (const [key, value] of Object.entries(firebaseConfig)) {
        if (!value && key !== 'measurementId') { // measurementId is optional
            throw new Error(`Firebase config is missing '${key}'. Check your .env file.`);
        }
    }
    
    if (!getApps().length) {
        console.log("Initializing Firebase App...");
        return initializeApp(firebaseConfig);
    } else {
        return getApp();
    }
}


const app: FirebaseApp = initializeFirebaseApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
