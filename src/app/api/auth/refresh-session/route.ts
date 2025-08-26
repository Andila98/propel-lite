
import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import { authConfig } from '@/config/server-config';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token format' }, { status: 401 });
    }
    
    await auth.verifyIdToken(idToken);
    
    const expiresIn = authConfig.cookieSerializeOptions.maxAge * 1000;
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });
    
    const response = NextResponse.json({ status: 'success' }, { status: 200 });
    response.cookies.set(authConfig.cookieName, sessionCookie, authConfig.cookieSerializeOptions);

    return response;
  } catch (error: any) {
    console.error('[ERROR: /api/auth/refresh-session]', error);
    return NextResponse.json({ error: 'Failed to refresh session.' }, { status: 401 });
  }
}
