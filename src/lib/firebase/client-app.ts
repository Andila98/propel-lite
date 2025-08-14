// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "propel-lite",
  "appId": "1:71781747717:web:98701b990b76c34f77606c",
  "storageBucket": "propel-lite.firebasestorage.app",
  "apiKey": "AIzaSyCcYPhpBKVFVnlsTAhK9lSH9sXQbshaid0",
  "authDomain": "propel-lite.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "71781747717"
};


// Initialize Firebase for client-side
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);

// Conditionally get analytics only in browser
let analytics;
if (typeof window !== "undefined") {
  // analytics = getAnalytics(app);
}

export { app, auth, db, analytics };
