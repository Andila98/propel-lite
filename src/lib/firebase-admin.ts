
import admin from 'firebase-admin';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const BUCKET_NAME = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

// The Firebase Admin SDK automatically looks for the GOOGLE_APPLICATION_CREDENTIALS
// environment variable. Ensure this variable is set to the path of your service account key.

if (!getApps().length) {
  initializeApp({
    credential: admin.credential.applicationDefault(),
    storageBucket: BUCKET_NAME,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

const db = getFirestore();
const bucket = getStorage().bucket(BUCKET_NAME);

export { db, bucket, admin };
