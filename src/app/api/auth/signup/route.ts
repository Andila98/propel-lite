
import { type NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { db, admin } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, displayName, password, role } = body;

    if (!email || !password || !role || !displayName) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (role !== 'landlord') {
        return NextResponse.json({ error: 'Invalid role specified. Only landlords can sign up here.' }, { status: 400 });
    }

    const userRecord = await getAuth().createUser({
      email,
      password,
      displayName,
    });

    await getAuth().setCustomUserClaims(userRecord.uid, {
      role: 'landlord',
    });

    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      name: displayName,
      role: 'landlord',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ message: 'Landlord account created successfully', userId: userRecord.uid }, { status: 201 });
  } catch (error: any) {
    console.error('[SIGNUP_ERROR]', error);
    if (error.code === 'auth/email-already-exists') {
        return NextResponse.json({ error: 'The email address is already in use by another account.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Signup failed. Please try again later.' }, { status: 500 });
  }
}
