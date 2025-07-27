
import admin from 'firebase-admin';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const BUCKET_NAME = "propel-lite.appspot.com";

// The Firebase Admin SDK automatically looks for the GOOGLE_APPLICATION_CREDENTIALS
// environment variable. Ensure this variable is set to the path of your service account key.

if (!getApps().length) {
  initializeApp({
    storageBucket: BUCKET_NAME
  });
}

const db = getFirestore();
const bucket = getStorage().bucket(BUCKET_NAME);

export { db, bucket, admin };
