
import admin from 'firebase-admin';
import { getApps, getApp, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// The Firebase Admin SDK automatically looks for the GOOGLE_APPLICATION_CREDENTIALS
// environment variable. Ensure this variable is set to the path of your service account key.

if (!getApps().length) {
  initializeApp({
    storageBucket: "propel-lite-9ed56.appspot.com"
  });
}

const db = getFirestore();
const bucket = getStorage().bucket("propel-lite-9ed56.appspot.com");

export { db, bucket, admin };
