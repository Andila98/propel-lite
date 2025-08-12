
import type { ServiceAccount } from 'firebase-admin';
import type { CookieSerializeOptions } from 'next-firebase-auth-edge';

// NOTE: This is a server-side only file.
// It is not exposed to the client.

const serviceAccount: ServiceAccount = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // Replace \\n with \n to correctly parse the private key from environment variables
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
};

const cookieSignatureKeys = [
    process.env.COOKIE_SIGNATURE_KEY_1!,
    process.env.COOKIE_SIGNATURE_KEY_2!
];

const cookieSerializeOptions: CookieSerializeOptions = {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    sameSite: 'lax' as const,
    maxAge: 12 * 60 * 60 * 24, // 12 days
};

export const authConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    cookieName: '__session',
    cookieSignatureKeys,
    cookieSerializeOptions,
    serviceAccount,
};
