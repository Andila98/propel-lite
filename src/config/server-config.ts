import type { CookieSerializeOptions } from 'cookie';
import { firebaseConfig as publicConfig } from './firebase-config';

// A utility function to safely get environment variables.
function getEnv(key: string, defaultValue?: string): string {
    const value = process.env[key];
    if (!value && defaultValue === undefined && process.env.NODE_ENV === 'production') {
        // In production, we expect these to be set in the environment.
        throw new Error(`Missing required environment variable in production: ${key}`);
    }
    return value || defaultValue || '';
}

const cookieSecretCurrent = getEnv('COOKIE_SECRET_CURRENT');
const cookieSecretPrevious = getEnv('COOKIE_SECRET_PREVIOUS');

export const authConfig = {
    apiKey: publicConfig.apiKey,
    cookieName: 'PropelAuth',
    cookieSignatureKeys: [cookieSecretCurrent, cookieSecretPrevious].filter(Boolean),
    cookieSerializeOptions: {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        maxAge: 12 * 60 * 60 * 24, // 12 days
    },
    serviceAccount: {
        projectId: publicConfig.projectId,
        clientEmail: getEnv('FIREBASE_CLIENT_EMAIL'),
        // Ensure private key is correctly formatted
        privateKey: getEnv('FIREBASE_PRIVATE_KEY', '').replace(/\\n/g, '\n'),
    },
};

// Warning for developers if credentials are not set during development
if (process.env.NODE_ENV === 'development') {
    const isConfigured = authConfig.serviceAccount.privateKey && authConfig.serviceAccount.clientEmail;
    if (!isConfigured) {
        console.warn(`[AUTH_CONFIG_WARN] Firebase Admin credentials are not set in environment variables. Server-side authentication will be disabled.`);
    } else {
         console.log(`[AUTH_CONFIG] Firebase Admin SDK configured for project: ${authConfig.serviceAccount.projectId}`);
    }
}
