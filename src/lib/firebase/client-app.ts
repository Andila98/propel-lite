
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

let app: FirebaseApp;
let auth: ReturnType<typeof getAuth>;
let db: ReturnType<typeof getFirestore>;

// Check if all required config values are present
const isConfigValid = Object.values(firebaseConfig).every(value => value);

if (isConfigValid) {
    if (!getApps().length) {
        app = initializeApp(firebaseConfig);
        console.log("Firebase initialized");
    } else {
        app = getApp();
    }
    auth = getAuth(app);
    db = getFirestore(app);
} else {
    console.error("Firebase config is missing or incomplete. Check your environment variables.");
    // Provide mock/dummy objects to prevent app from crashing
    app = {} as FirebaseApp;
    auth = {} as ReturnType<typeof getAuth>;
    db = {} as ReturnType<typeof getFirestore>;
}


export { app, auth, db };
