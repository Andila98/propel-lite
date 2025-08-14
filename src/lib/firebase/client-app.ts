
// src/lib/firebase/client-app.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAh3_w39v-LhQ0txefaM2y6sn8C7tD6rqE",
  authDomain: "propel-lite-9ed56.firebaseapp.com",
  projectId: "propel-lite-9ed56",
  storageBucket: "propel-lite-9ed56.appspot.com",
  messagingSenderId: "72284672505",
  appId: "1:72284672505:web:20c0c78093d5086d682d28",
  measurementId: "G-BB9NLCFL9B"
};


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
