
import { type NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/lib/firebase-admin';
import { randomBytes } from 'crypto';
import { getTokens } from 'next-firebase-auth-edge';
import { authConfig } from '@/config/server-config';

export async function POST(req: NextRequest) {
  try {
    const tokens = await getTokens(req, authConfig);
    if (!tokens || tokens.decodedToken.role !== 'landlord') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const landlordId = tokens.decodedToken.uid;

    const { email } = await req.json();
    if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    
    const token = randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

    await db.collection('invites').add({
      email,
      role: 'manager',
      landlordId: landlordId,
      token,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt,
    });
    
    return NextResponse.json({ message: 'Invitation sent successfully.', token });
  } catch (err: any) {
    console.error('[INVITE_MANAGER_ERROR]', err);
    if (err.message.includes('Auth cookie could not be found')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 });
  }
}
