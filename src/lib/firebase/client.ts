import { initializeApp, getApps, getApp, FirebaseOptions } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { firebaseConfig } from '@/config/firebase-config';

const app = !getApps().length ? initializeApp(firebaseConfig as FirebaseOptions) : getApp();

const auth = getAuth(app);
const firestore = getFirestore(app);

// In a local development environment, connect to the emulators
if (process.env.NODE_ENV === 'development') {
    // It's important to check if the emulators are already running to avoid errors.
    // The connect*Emulator functions throw an error if called more than once.
    // A simple check like this is not foolproof in HMR environments, but it's a good start.
    // @ts-ignore - _isInitialized is not in the public API but useful here.
    if (!auth.emulatorConfig) {
        try {
            connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
        } catch (e) {
            console.warn('Auth emulator already connected or failed to connect:', e);
        }
    }
    // @ts-ignore - _isInitialized is not in the public API but useful here.
    if (!firestore._settings.host) {
        try {
            connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
        } catch (e) {
            console.warn('Firestore emulator already connected or failed to connect:', e);
        }
    }
}


export { app, auth, firestore };
