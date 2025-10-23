
export const authConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    cookieName: 'PropelLiteAuth',
    cookieSerializeOptions: {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const, // Use 'lax' for better compatibility with social logins
        maxAge: 12 * 60 * 60 * 24, // 12 days
    },
};

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
