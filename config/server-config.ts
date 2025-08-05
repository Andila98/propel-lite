
export const authConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    cookieName: '__session',
    cookieSignatureKeys: [process.env.COOKIE_SIGNATURE_KEY_1!, process.env.COOKIE_SIGNATURE_KEY_2!],
    cookieSerializeOptions: {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: 12 * 60 * 60 * 24, // 12 days
    },
    serviceAccount: {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    },
};
