
import { type NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/server-utils';
import { db, isFirebaseAdminInitialized } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

/**
 * Handles fetching the current authenticated user's profile.
 * 1. Verifies the session cookie from the request.
 * 2. If valid, fetches the user's profile from the 'users' collection in Firestore.
 * 3. Returns the user's data.
 */
export async function GET(req: NextRequest) {
  if (!isFirebaseAdminInitialized) {
    return NextResponse.json({ error: 'Firebase Admin not configured on the server.' }, { status: 503 });
  }
  
  const { decodedToken, error } = await verifyApiAuth(req);

  if (error) {
    return error; // Return the unauthorized response
  }

  try {
    const { uid } = decodedToken;
    const userDoc = await db().collection('users').doc(uid).get();

    if (!userDoc.exists) {
      console.error(`[API_ME_ERROR] Firestore user document not found for UID: ${uid}`);
      return NextResponse.json({ error: 'User data not found.' }, { status: 404 });
    }

    const userData = userDoc.data();
    // Omit sensitive data if necessary before sending to client
    // For now, we return the full user object
    return NextResponse.json(userData, { status: 200 });

  } catch (err: any) {
    console.error(`[API_ME_ERROR] Error fetching user data for UID ${decodedToken.uid}:`, err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
