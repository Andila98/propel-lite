import type { CookieSerializeOptions } from 'cookie';
import { firebaseConfig as publicConfig } from './firebase-config';

const cookieSecretCurrent = process.env.COOKIE_SECRET_CURRENT || '';
const cookieSecretPrevious = process.env.COOKIE_SECRET_PREVIOUS || '';

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
        projectId: process.env.FIREBASE_PROJECT_ID || publicConfig.projectId,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
        // Ensure private key is correctly formatted
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
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
