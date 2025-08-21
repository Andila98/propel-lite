
import { type NextRequest, NextResponse } from 'next/server';
import { auth, firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { authConfig } from '@/config/server-config';
import type { User } from '@/hooks/use-auth';

export async function GET(req: NextRequest) {
    if (!isFirebaseAdminInitialized) {
        console.error('[API_ME] Firebase Admin is not initialized.');
        return NextResponse.json({ error: 'Firebase is not initialized. Please check server credentials.' }, { status: 500 });
    }

    const sessionCookie = req.cookies.get(authConfig.cookieName)?.value;
    const authToken = req.headers.get('Authorization')?.split('Bearer ')[1];

    let decodedToken;

    try {
        if (sessionCookie) {
        decodedToken = await auth.verifySessionCookie(sessionCookie, true);
        } else if (authToken) {
        decodedToken = await auth.verifyIdToken(authToken, true);
        } else {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userRecord = await auth.getUser(decodedToken.uid);

        let permissions = {};
        if (userRecord.customClaims?.role === 'manager') {
            const managerDoc = await firestore.collection('managers').doc(userRecord.uid).get();
            if (managerDoc.exists) {
                permissions = managerDoc.data()?.permissions || {};
            }
        }

        const userProfile: User = {
            uid: userRecord.uid,
            email: userRecord.email!,
            name: userRecord.displayName || 'Unnamed User',
            role: (userRecord.customClaims?.role as any) || 'tenant',
            profileComplete: userRecord.customClaims?.profileComplete || false,
            avatarUrl: userRecord.photoURL,
            permissions: permissions,
        };
        
        return NextResponse.json(userProfile, { status: 200 });
        
    } catch (error) {
        console.error('[API_ME_ERROR] Error fetching user profile:', error);
        // Clear cookie if invalid? Handled by logout on frontend.
        return NextResponse.json({ error: 'Unauthorized: Invalid token or session.' }, { status: 401 });
    }
}
