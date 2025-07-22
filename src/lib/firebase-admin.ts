import admin from 'firebase-admin';
import { getApps, getApp, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// IMPORTANT: Download your service account key from Firebase console
// and place it in the root of your project as 'firebaseServiceAccountKey.json'
// Make sure this file is added to .gitignore
const serviceAccount = require('../../firebaseServiceAccountKey.json');

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    storageBucket: "propel-lite-9ed56.appspot.com"
  });
}

const db = getFirestore();
const bucket = getStorage().bucket();

export { db, bucket, admin };
