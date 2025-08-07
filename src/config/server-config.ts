

import type { ServiceAccount } from 'firebase-admin';
import type { CookieSerializeOptions } from 'next-firebase-auth-edge';

// NOTE: This is a server-side only file.
// It is not exposed to the client.

// The service account is used to initialize the Firebase Admin SDK.
// It is required for all backend operations that interact with Firebase services.
const serviceAccount: ServiceAccount = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    // Replace \\n with \n to correctly parse the private key from environment variables
    privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
};

// The API key is used by the `next-firebase-auth-edge` library to sign the session cookie.
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY!;

// These keys are used to sign and encrypt the session cookie.
// They must be kept secret and should be unique for your application.
const cookieSignatureKeys = [
    process.env.COOKIE_SIGNATURE_KEY_1!, 
    process.env.COOKIE_SIGNATURE_KEY_2!
];

// These options control the behavior of the session cookie.
const cookieSerializeOptions: CookieSerializeOptions = {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    sameSite: 'lax' as const,
    maxAge: 12 * 60 * 60 * 24, // 12 days
};

export const authConfig = {
    apiKey,
    cookieName: '__session',
    cookieSignatureKeys,
    cookieSerializeOptions,
    serviceAccount,
};
