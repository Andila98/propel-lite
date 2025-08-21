
import type { CookieSerializeOptions } from 'cookie';
import { firebaseConfig as publicConfig } from '@/config/firebase-config';

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
};

// A simple log during development to confirm which project is being targeted by the Admin SDK.
if (process.env.NODE_ENV === 'development') {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
         console.log(`[AUTH_CONFIG] Firebase Admin SDK configured via GOOGLE_APPLICATION_CREDENTIALS.`);
    }
}
