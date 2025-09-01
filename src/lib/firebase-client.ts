
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { firebaseConfig as publicConfig } from '@/config/firebase-config';

// The public config is just a set of keys, not the full FirebaseOptions
const firebaseConfig: FirebaseOptions = publicConfig;

// Initialize Firebase for the client
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Explicitly initialize only the services we need.
// This prevents Firebase Analytics from being automatically initialized
// and causing console errors due to ad blockers.
const auth = getAuth(app);
const firestore = getFirestore(app);
const storage = getStorage(app);

export { auth, firestore, storage, app };
