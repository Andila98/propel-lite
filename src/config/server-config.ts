
import type { CookieSerializeOptions } from 'cookie';

// A utility function to safely get environment variables.
function getEnv(key: string, defaultValue?: string): string {
    const value = process.env[key];
    if (!value && process.env.NODE_ENV === 'production' && defaultValue === undefined) {
        throw new Error(`Missing required environment variable in production: ${key}`);
    }
    return value || defaultValue!;
}

const cookieSecretCurrent = getEnv('COOKIE_SECRET_CURRENT', 'secret');
const cookieSecretPrevious = getEnv('COOKIE_SECRET_PREVIOUS', 'secret');

export const authConfig = {
    apiKey: getEnv('NEXT_PUBLIC_FIREBASE_API_KEY'),
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
        projectId: getEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
        clientEmail: getEnv('FIREBASE_CLIENT_EMAIL'),
        privateKey: getEnv('FIREBASE_PRIVATE_KEY', '').replace(/\\n/g, '\n'),
    },
    tenantId: process.env.FIREBASE_TENANT_ID,
};

if (process.env.NODE_ENV === 'development') {
    console.log('[AUTH_CONFIG] Firebase Auth Config Initialized:');
    console.log(`- Project ID: ${authConfig.serviceAccount.projectId || 'NOT SET'}`);
    console.log(`- API Key Loaded: ${!!authConfig.apiKey}`);
    console.log(`- Private Key Loaded: ${!!authConfig.serviceAccount.privateKey}`);
    console.log(`- Tenant ID: ${authConfig.tenantId || 'Not Set'}`);
}
