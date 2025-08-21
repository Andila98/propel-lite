
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { firebaseConfig } from '@/config/firebase-config';
import { getAnalytics, isSupported } from 'firebase/analytics';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const firestore = getFirestore(app);
const storage = getStorage(app);

// Connect to emulators if running locally
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  console.log('[FIREBASE_CLIENT] Localhost detected, connecting to emulators...');
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(firestore, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
}

// Initialize Analytics only if it's supported in the browser
if (typeof window !== 'undefined') {
    isSupported().then((supported) => {
        if (supported) {
            getAnalytics(app);
        }
    });
}

export { auth, firestore, storage };
