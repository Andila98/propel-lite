
import type { FirebaseAuthEdgeConfig } from 'next-firebase-auth-edge';
import type { CookieSerializeOptions } from 'cookie';

function getRequiredEnv(key: string): string {
    const value = process.env[key];
    if (!value || value.trim() === '') {
        throw new Error(`Missing or empty environment variable: ${key}`);
    }
    return value.trim();
}

const cookieSignatureKeys = [
    getRequiredEnv('COOKIE_SECRET_CURRENT'),
    getRequiredEnv('COOKIE_SECRET_PREVIOUS'),
];

const cookieSerializeOptions: CookieSerializeOptions = {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 12 * 60 * 60 * 24, // 12 days
};

const serviceAccount = {
    projectId: getRequiredEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
    clientEmail: getRequiredEnv('FIREBASE_CLIENT_EMAIL'),
    privateKey: getRequiredEnv('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
};

export const authConfig: FirebaseAuthEdgeConfig = {
    apiKey: getRequiredEnv('NEXT_PUBLIC_FIREBASE_API_KEY'),
    cookieName: 'PropelAuth',
    cookieSignatureKeys,
    cookieSerializeOptions,
    serviceAccount,
    tenantId: process.env.FIREBASE_TENANT_ID, // Optional
};

function validateConfig() {
    if (cookieSignatureKeys.length < 2) {
        throw new Error('At least 2 cookie signature keys are required for key rotation');
    }
    
    if (serviceAccount.privateKey.includes('\\n')) {
        console.warn('Private key may not be properly formatted');
    }
}

validateConfig();

if (process.env.NODE_ENV === 'development') {
    console.log('Firebase Auth Config loaded:', {
        projectId: serviceAccount.projectId,
        hasPrivateKey: !!serviceAccount.privateKey,
        hasApiKey: !!authConfig.apiKey,
        cookieSignatureKeysCount: cookieSignatureKeys.length,
        tenantId: authConfig.tenantId || 'N/A'
    });
}
