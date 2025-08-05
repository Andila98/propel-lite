
import { type NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/lib/firebase-admin';
import { withRole, type AuthenticatedRequest } from '@/lib/middleware/withRole';
import { randomBytes } from 'crypto';

export const POST = withRole(async (req: AuthenticatedRequest) => {
  try {
    const { uid: landlordId } = req.user;

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
      landlordId: landlordId,
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
    return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 });
  }
}, ['landlord']);
