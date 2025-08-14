
import type { FirebaseAuthEdgeConfig } from 'next-firebase-auth-edge';
import type { CookieSerializeOptions } from 'cookie';

// A utility function to safely get environment variables.
function getEnv(key: string, defaultValue?: string): string {
    const value = process.env[key];
    if (!value && defaultValue === undefined) { // No value and no default means it's required.
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value || defaultValue!;
}

// Use a single secret key for simplicity, which is sufficient for many applications.
// For enhanced security with key rotation, two keys can be used.
const cookieSecretCurrent = getEnv('COOKIE_SECRET_CURRENT', 'secret');
const cookieSecretPrevious = getEnv('COOKIE_SECRET_PREVIOUS', 'secret');


const cookieSerializeOptions: CookieSerializeOptions = {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 12 * 60 * 60 * 24, // 12 days
};

const serviceAccount = {
    projectId: getEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'propel-lite'),
    clientEmail: getEnv('FIREBASE_CLIENT_EMAIL', 'firebase-adminsdk-y9lql@propel-lite.iam.gserviceaccount.com'),
    // Ensure the private key is correctly formatted.
    privateKey: getEnv('FIREBASE_PRIVATE_KEY', '').replace(/\\n/g, '\n'),
};

export const authConfig: FirebaseAuthEdgeConfig = {
    apiKey: getEnv('NEXT_PUBLIC_FIREBASE_API_KEY', 'AIzaSyCcYPhpBKVFVnlsTAhK9lSH9sXQbshaid0'),
    cookieName: 'PropelAuth',
    cookieSignatureKeys: [cookieSecretCurrent, cookieSecretPrevious],
    cookieSerializeOptions,
    serviceAccount,
    tenantId: process.env.FIREBASE_TENANT_ID, // Optional
};

// Log configuration in development to help with debugging.
if (process.env.NODE_ENV === 'development') {
    console.log('[AUTH_CONFIG] Firebase Auth Config Initialized:');
    console.log(`- Project ID: ${serviceAccount.projectId}`);
    console.log(`- API Key Loaded: ${!!authConfig.apiKey}`);
    console.log(`- Private Key Loaded: ${!!serviceAccount.privateKey}`);
    console.log(`- Tenant ID: ${authConfig.tenantId || 'Not Set'}`);
}
