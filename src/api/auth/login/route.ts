
import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import { authConfig } from '@/config/server-config';
import { serialize } from 'cookie';
import type { User } from '@/hooks/use-auth';

export async function POST(request: NextRequest) {
  const authToken = request.headers.get('Authorization')?.split('Bearer ')[1];

  if (!authToken) {
    return NextResponse.json({ error: 'Missing authorization token.' }, { status: 401 });
  }

  try {
    const decodedToken = await auth.verifyIdToken(authToken);
    const expiresIn = 60 * 60 * 24 * 14 * 1000; // 14 days
    const sessionCookie = await auth.createSessionCookie(authToken, { expiresIn });

    const userRecord = await auth.getUser(decodedToken.uid);
    const userProfile: User = {
        uid: userRecord.uid,
        email: userRecord.email!,
        name: userRecord.displayName || 'Unnamed User',
        role: (userRecord.customClaims?.role as any) || 'tenant',
        profileComplete: userRecord.customClaims?.profileComplete || false,
        avatarUrl: userRecord.photoURL,
    };
    
    const cookie = serialize(authConfig.cookieName, sessionCookie, authConfig.cookieSerializeOptions);

    const response = NextResponse.json(userProfile, { status: 200 });
    response.headers.set('Set-Cookie', cookie);
    return response;

  } catch (error: any) {
    console.error('Login Error:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
