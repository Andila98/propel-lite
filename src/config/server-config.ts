import type { CookieSerializeOptions } from 'cookie';
import { firebaseConfig as publicConfig } from './firebase-config';

// A utility function to safely get environment variables.
function getEnv(key: string, defaultValue?: string): string {
    const value = process.env[key];
    if (!value && defaultValue === undefined && process.env.NODE_ENV === 'production') {
        // In production, we expect these to be set in the environment.
        // Throwing an error here helps catch configuration issues early.
        throw new Error(`Missing required environment variable in production: ${key}`);
    }
    return value || defaultValue || '';
}

const cookieSecretCurrent = getEnv('COOKIE_SECRET_CURRENT', 'a_secure_default_secret_for_development_only');
const cookieSecretPrevious = getEnv('COOKIE_SECRET_PREVIOUS', 'another_secure_default_secret_for_development');

export const authConfig = {
    apiKey: publicConfig.apiKey,
    cookieName: 'PropelAuth',
    cookieSignatureKeys: [cookieSecretCurrent, cookieSecretPrevious],
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
        privateKey: getEnv('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
    },
    tenantId: process.env.FIREBASE_TENANT_ID,
};

if (process.env.NODE_ENV === 'development') {
    console.log('[AUTH_CONFIG] Firebase Auth Config Initialized for Development:');
    console.log(`- Project ID: ${authConfig.serviceAccount.projectId || 'NOT SET'}`);
    console.log(`- Client Email Loaded: ${!!authConfig.serviceAccount.clientEmail}`);
    console.log(`- Private Key Loaded: ${!!authConfig.serviceAccount.privateKey}`);
}
