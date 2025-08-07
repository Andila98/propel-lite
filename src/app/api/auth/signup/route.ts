
import { type NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { db, admin } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, displayName, phone, password, role } = body;

    if (!email || !password || !role || !displayName) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (role !== 'tenant') {
        return NextResponse.json({ error: 'Invalid role specified. Only tenants can sign up through this form.' }, { status: 400 });
    }

    const userRecord = await getAuth().createUser({
      email,
      password,
      displayName,
      phoneNumber: phone,
    });

    // For tenants, landlordId must be assigned later, perhaps through an invite or property assignment flow.
    await getAuth().setCustomUserClaims(userRecord.uid, {
      role,
      landlordId: null, 
    });

    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      displayName,
      phone: phone || null,
      role,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ message: 'Account created successfully', userId: userRecord.uid }, { status: 201 });
  } catch (error: any) {
    console.error('[SIGNUP_ERROR]', error);
    if (error.code === 'auth/email-already-exists') {
        return NextResponse.json({ error: 'The email address is already in use by another account.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Signup failed. Please try again later.' }, { status: 500 });
  }
}
