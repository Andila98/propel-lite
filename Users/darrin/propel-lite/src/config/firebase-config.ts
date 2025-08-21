
// Import the functions you need from the SDKs you need
import { initializeApp , getApps } from "firebase/app";
import { getAnalytics  } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: "AIzaSyAh3_w39v-LhQ0txefaM2y6sn8C7tD6rqE",
  authDomain: "propel-lite-9ed56.firebaseapp.com",
  projectId: "propel-lite-9ed56",
  storageBucket: "propel-lite-9ed56.appspot.com",
  messagingSenderId: "72284672505",
  appId: "1:72284672505:web:20c0c78093d5086d682d28",
  measurementId: "G-BB9NLCFL9B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
//const analytics = getAnalytics(app);
const auth = getAuth(app);
const firestore = getFirestore(app);

export { auth, firestore , app };
