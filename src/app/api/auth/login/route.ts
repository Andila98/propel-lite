
import { type NextRequest, NextResponse } from 'next/server';
import { getTokens } from 'next-firebase-auth-edge';
import { authConfig } from '@/config/server-config';
import { admin, db } from '@/lib/firebase-admin';
import { z } from 'zod';

// Define a schema for the user data in Firestore
const UserSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['landlord', 'tenant', 'admin']),
  createdAt: z.any(), // Firestore timestamps can be complex to validate here
  isActive: z.boolean(),
  profileComplete: z.boolean(),
});

async function handler(request: NextRequest) {
  const clientIP = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
  try {
    const { idToken } = await request.json();
    console.log('[API_LOGIN] Backend: ID Token received from frontend.');
    if (!idToken || typeof idToken !== 'string' || idToken.trim().length === 0) {
      return NextResponse.json({ error: 'Valid ID token is required' }, { status: 400 });
    }
    
    // Action 1: Verify the token to get the UID without setting cookies yet.
    const decodedIdToken = await admin.auth().verifyIdToken(idToken);
    const { uid } = decodedIdToken;
    console.log(`[API_LOGIN] Action 1: Token verified successfully for UID: ${uid}, Email: ${decodedIdToken.email}`);

    // Action 2: Fetch user data from Firestore and validate its schema.
    const userDocRef = db.collection('users').doc(uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      console.error(`[API_LOGIN_ERROR] Firestore user document not found for UID: ${uid}`);
      return NextResponse.json({ error: 'User data not found in Firestore. Please contact support.' }, { status: 404 });
    }
    
    const userData = userDoc.data();
    const validationResult = UserSchema.safeParse(userData);

    if (!validationResult.success) {
        console.error(`[API_LOGIN_SCHEMA_MISMATCH] UID: ${uid}`, validationResult.error.flatten());
        return NextResponse.json({ error: 'User data is malformed. Please contact support.' }, { status: 500 });
    }

    const { role } = validationResult.data;
    console.log(`[API_LOGIN] Action 2: Firestore document found and schema validated. User role is: ${role}`);
    
    // Action 3: Now, generate session cookies with the verified token and role.
    const tokens = await getTokens(request, { ...authConfig, idToken });
    const { cookie } = tokens;
    console.log('[API_LOGIN] Action 3: Session cookie generated.');

    const response = NextResponse.json({ success: true, role }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    response.cookies.set(authConfig.cookieName, cookie, authConfig.cookieSerializeOptions);

    console.log('[LOGIN_SUCCESS]', {
      uid,
      email: decodedIdToken.email,
      role,
      timestamp: new Date().toISOString(),
      ip: clientIP,
    });
    
    return response;
  } catch (error: any) {
    console.error('[LOGIN_ERROR]', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      ip: clientIP,
    });

    if (error.code) {
      switch (error.code) {
        case 'auth/id-token-expired':
          return NextResponse.json({ error: 'Token expired. Please login again.' }, { status: 401 });
        case 'auth/id-token-revoked':
          return NextResponse.json({ error: 'Access revoked. Please login again.' }, { status: 401 });
        case 'auth/invalid-id-token':
          return NextResponse.json({ error: 'Invalid authentication token.' }, { status: 401 });
        case 'auth/user-disabled':
          return NextResponse.json({ error: 'Account has been disabled.' }, { status: 403 });
        default:
          return NextResponse.json({ error: 'Authentication failed.' }, { status: 401 });
      }
    }
    
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export { handler as POST };
