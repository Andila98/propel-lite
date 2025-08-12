
import type { ServiceAccount } from 'firebase-admin';
import type { CookieSerializeOptions } from 'next-firebase-auth-edge';

// NOTE: This is a server-side only file.
// It is not exposed to the client.

// Enhanced Environment Validation
function getRequiredEnv(key: string): string {
    const value = process.env[key];
    if (!value || value.trim() === '') {
        throw new Error(`Missing or empty environment variable: ${key}`);
    }
    return value.trim();
}


const serviceAccount: ServiceAccount = {
    projectId: getRequiredEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
    clientEmail: getRequiredEnv('FIREBASE_CLIENT_EMAIL'),
    // Replace \\n with \n to correctly parse the private key from environment variables
    privateKey: getRequiredEnv('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
};

const cookieSignatureKeys = [
    getRequiredEnv('COOKIE_SIGNATURE_KEY_1'),
    getRequiredEnv('COOKIE_SIGNATURE_KEY_2')
];

// Cookie Security Enhancement
const cookieSerializeOptions: CookieSerializeOptions = {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    sameSite: 'strict', // 'strict' for better CSRF protection
    maxAge: 12 * 60 * 60 * 24, // 12 days
};

export const authConfig = {
    apiKey: getRequiredEnv('NEXT_PUBLIC_FIREBASE_API_KEY'),
    cookieName: '__session',
    cookieSignatureKeys,
    cookieSerializeOptions,
    serviceAccount,
};

// Configuration Validation
function validateConfig() {
    if (cookieSignatureKeys.length < 2) {
        throw new Error('At least 2 cookie signature keys are required for key rotation.');
    }
    
    if (serviceAccount.privateKey.includes('\\n')) {
        console.warn('Private key may not be properly formatted. Ensure newlines are correctly replaced.');
    }

    if (!serviceAccount.projectId) {
        throw new Error("Firebase Project ID is missing from service account config.");
    }

    if (!serviceAccount.clientEmail) {
        throw new Error("Firebase Client Email is missing from service account config.");
    }
}

// Call validation on module load
validateConfig();

// Debug Logging (Development Only)
if (process.env.NODE_ENV === 'development') {
    console.log('Firebase Auth Config loaded:', {
        projectId: serviceAccount.projectId,
        hasPrivateKey: !!serviceAccount.privateKey,
        hasApiKey: !!authConfig.apiKey,
        cookieSignatureKeysCount: cookieSignatureKeys.length
    });
}
