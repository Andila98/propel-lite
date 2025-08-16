
import { type NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/server-utils';
import { firestore } from '@/lib/firebase-admin';
import { getStorage } from '@/lib/storage/provider';

export const runtime = 'nodejs';

/**
 * Handles fetching the current authenticated user's profile.
 * 1. Verifies the session cookie from the request.
 * 2. If valid, fetches the user's profile from the 'users' collection in Firestore.
 * 3. Generates a signed URL for the profile image if it exists.
 * 4. Returns the user's data.
 */
export async function GET(req: NextRequest) {
  const { decodedToken, error } = await verifyApiAuth(req);

  if (error) {
    return error; // Return the unauthorized response
  }

  try {
    const { uid } = decodedToken;
    const userDoc = await firestore.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      console.error(`[API_ME_ERROR] Firestore user document not found for UID: ${uid}`);
      return NextResponse.json({ error: 'User data not found.' }, { status: 404 });
    }

    const userData = userDoc.data();
    
    // If user has a profile image, generate a signed URL for it
    if (userData?.profileImageKey) {
        const storage = getStorage();
        if (storage.getSignedUrl) {
            const { signedUrl, error: signedUrlError } = await storage.getSignedUrl(userData.profileImageKey);
            if (signedUrlError) {
                console.error(`[API_ME_ERROR] Failed to get signed URL for ${userData.profileImageKey}:`, signedUrlError);
                // Proceed without avatarUrl, but log the error
            } else {
                userData.avatarUrl = signedUrl;
            }
        } else {
             // Fallback to public URL if the provider doesn't support signed URLs
            userData.avatarUrl = storage.getPublicUrl(userData.profileImageKey);
        }
    }
    
    // Omit sensitive data if necessary before sending to client
    // For now, we return the full user object
    return NextResponse.json(userData, { status: 200 });

  } catch (err: any) {
    console.error(`[API_ME_ERROR] Error fetching user data for UID ${decodedToken.uid}:`, err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
