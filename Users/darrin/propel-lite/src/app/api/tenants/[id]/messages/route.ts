
import { type NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { auth } from '@/lib/firebase-admin';

async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
    const sessionCookie = req.cookies.get('PropelAuth')?.value;
    if (!sessionCookie) return null;

    try {
        const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
        return decodedClaims.uid;
    } catch (error) {
        console.error("[MESSAGES_API] Could not verify session cookie:", error);
        return null;
    }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = params.id;
    const messagesSnapshot = await firestore
        .collection('messages')
        .where('tenantId', '==', tenantId)
        .orderBy('timestamp', 'asc')
        .get();
        
    const messages = messagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json(messages);
  } catch (error: any) {
    console.error(`API Error: Failed to fetch messages for tenant ${params.id}:`, error);
    return NextResponse.json(
      { error: `Failed to fetch messages: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = params.id;
    const body = await request.json();
    const { content } = body;
    
    // In a real app, you would fetch landlord details.
    const landlordName = "Landlord"; 
    console.log(`[MESSAGES_API] Sending message from ${userId} to ${tenantId}`);

    const newMessage = {
      tenantId: tenantId,
      senderId: userId, 
      senderName: landlordName,
      content,
      timestamp: FieldValue.serverTimestamp(),
      isRead: false,
    };
    
    const docRef = await firestore.collection('messages').add(newMessage);
    
    const sentMessage = {
      id: docRef.id,
      ...newMessage,
      timestamp: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } // Approximate for client
    };
    
    return NextResponse.json(sentMessage, { status: 201 });

  } catch (error: any) {
    console.error(`API Error: Failed to send message for tenant ${params.id}:`, error);
    return NextResponse.json(
      { error: `Failed to send message: ${error.message}` },
      { status: 500 }
    );
  }
}
