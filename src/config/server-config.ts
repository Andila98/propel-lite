
import type { CookieSerializeOptions } from 'cookie';
import { firebaseConfig as publicConfig } from './firebase-config';

// This file is responsible for reading environment variables and creating a configuration object.
// It uses simple fallbacks to empty strings to prevent build-time errors if variables are not set.
// The actual logic to handle missing credentials should be in the service that consumes this config (e.g., firebase-admin.ts).

export const authConfig = {
    apiKey: publicConfig.apiKey,
    cookieName: 'PropelAuth',
    cookieSerializeOptions: {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        maxAge: 12 * 60 * 60 * 24, // 12 days
    },
    serviceAccount: {
        projectId: process.env.FIREBASE_PROJECT_ID || '',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
        // The private key needs newlines correctly formatted.
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    },
};

// A simple log during development to confirm which project is being targeted by the Admin SDK.
if (process.env.NODE_ENV === 'development') {
    if (authConfig.serviceAccount.projectId) {
         console.log(`[AUTH_CONFIG] Firebase Admin SDK configured for project: ${authConfig.serviceAccount.projectId}`);
    }
}
