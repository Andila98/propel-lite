
import { type NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/lib/firebase-admin';
import { verifyFirebaseToken } from '@/lib/server-utils';
import { randomBytes } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { userId, role } = await verifyFirebaseToken(req);
    if (role !== 'landlord') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { email } = await req.json();
    if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    
    // In a real application, consider a more robust token generation strategy.
    const token = randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

    await db.collection('invites').add({
      email,
      role: 'manager',
      landlordId: userId,
      token,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt,
    });
    
    // In a real app, you would also trigger an email service here to send the invite link.
    // e.g., sendInviteEmail(email, token);

    return NextResponse.json({ message: 'Invitation sent successfully.', token });
  } catch (err: any) {
    console.error('[INVITE_MANAGER_ERROR]', err);
    if (err.message.includes('No auth token provided')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 });
  }
}
