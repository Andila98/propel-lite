// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAh3_w39v-LhQ0txefaM2y6sn8C7tD6rqE",
  authDomain: "propel-lite-9ed56.firebaseapp.com",
  projectId: "propel-lite-9ed56",
  storageBucket: "propel-lite-9ed56.appspot.com",
  messagingSenderId: "72284672505",
  appId: "1:72284672505:web:20c0c78093d5086d682d28",
  measurementId: "G-BB9NLCFL9B"
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
  analytics = getAnalytics(app);
}

export { app, auth, db, analytics };