
// src/lib/firebase/client-app.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};


let app: FirebaseApp;
// Check if all required config values are present
const isConfigComplete = firebaseConfig.apiKey && firebaseConfig.projectId;

if (isConfigComplete && !getApps().length) {
    app = initializeApp(firebaseConfig);
} else if (isConfigComplete) {
    app = getApp();
} else {
    console.error("Firebase config is missing or incomplete. Check your environment variables.");
    // Provide mock/dummy objects in a failed state to prevent app from crashing
    // This part of the code should ideally not be reached if environment variables are set correctly.
    app = {} as FirebaseApp;
}

const auth = getAuth(app);
const db = getFirestore(app);

// Initialize Analytics and export it
const analytics = isSupported().then(yes => yes ? getAnalytics(app) : null);

export { app, auth, db, analytics };
