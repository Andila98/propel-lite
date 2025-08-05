
import { type NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { db, admin } from '@/lib/firebase-admin';
import type { User } from 'firebase-admin/auth';

export async function POST(req: NextRequest) {
  try {
    const { displayName, password, token } = await req.json();

    if (!displayName || !password || !token) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const invitesSnapshot = await db.collection('invites')
      .where('token', '==', token)
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (invitesSnapshot.empty) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 404 });
    }
    
    const inviteDoc = invitesSnapshot.docs[0];
    const inviteData = inviteDoc.data();

    // Check if the token has expired
    const expiresAt = inviteData.expiresAt.toDate();
    if (new Date() > expiresAt) {
      await inviteDoc.ref.update({ status: 'expired' });
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 });
    }
    
    const { email, landlordId } = inviteData;
    let userRecord: User;

    try {
        userRecord = await getAuth().createUser({
            email,
            password,
            displayName,
        });
    } catch (error: any) {
        if (error.code === 'auth/email-already-exists') {
            return NextResponse.json({ error: 'This email is already in use.' }, { status: 409 });
        }
        throw error;
    }

    await getAuth().setCustomUserClaims(userRecord.uid, {
      role: 'manager',
      landlordId,
    });

    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      displayName,
      email,
      role: 'manager',
      landlordId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await inviteDoc.ref.update({ 
        status: 'accepted',
        acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
        acceptedByUid: userRecord.uid,
    });

    return NextResponse.json({ message: 'Manager account created successfully' }, { status: 201 });
  } catch (error: any) {
    console.error('[ACCEPT_INVITE_ERROR]', error);
    return NextResponse.json({ error: 'Failed to create manager account.' }, { status: 500 });
  }
}
