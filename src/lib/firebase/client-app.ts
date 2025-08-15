// src/lib/firebase/client-app.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";
import { firebaseConfig } from "@/config/firebase-config";


let app: FirebaseApp;

if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);

// Initialize Analytics and export it
const analytics = isSupported().then(yes => yes ? getAnalytics(app) : null);

export { app, auth, db, analytics };
