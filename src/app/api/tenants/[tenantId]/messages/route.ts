
import { type NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/lib/firebase-admin';
import type { Message } from '@/lib/types';

// GET /api/tenants/[tenantId]/messages
export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const tenantId = params.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    const messagesSnapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('messages')
      .orderBy('timestamp', 'asc')
      .get();

    const messages = messagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json(messages);
  } catch (error: any) {
    console.error(`API Error: Failed to fetch messages for tenant ${params.tenantId}:`, error);
    return NextResponse.json(
      { error: `Failed to fetch messages: ${error.message}` },
      { status: 500 }
    );
  }
}

// POST /api/tenants/[tenantId]/messages
export async function POST(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const tenantId = params.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    const landlordId = "user_12345"; // In a real app, get this from the authenticated user session
    const landlordName = "Landlord"; // In a real app, get this from the user's profile

    const newMessage: Omit<Message, 'id'> = {
      senderId: landlordId,
      senderName: landlordName,
      content,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      isRead: false,
    };

    const docRef = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('messages')
      .add(newMessage);

    const messageDoc = await docRef.get();
    const createdMessage = { id: messageDoc.id, ...messageDoc.data() };

    return NextResponse.json(createdMessage, { status: 201 });

  } catch (error: any) {
    console.error(`API Error: Failed to send message for tenant ${params.tenantId}:`, error);
    return NextResponse.json(
      { error: `Failed to send message: ${error.message}` },
      { status: 500 }
    );
  }
}
