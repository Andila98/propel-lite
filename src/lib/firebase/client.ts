import { initializeApp, getApps, getApp, FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/config/firebase-config';

const app = !getApps().length ? initializeApp(firebaseConfig as FirebaseOptions) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);

// DON'T connect to emulators in Cloud Workstations
// Only use emulators in true local development
