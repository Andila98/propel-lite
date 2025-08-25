
import { NextResponse, type NextRequest } from 'next/server';
import { firestore } from '@/lib/firebase-admin';
import { toJSON } from '@/lib/utils';
import { getUserIdFromRequest } from '@/lib/auth-utils';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

// GET /api/tenants/{tenantId}/messages
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tenantId = params.id;
    
    const messagesSnapshot = await firestore.collection('messages')
      .where('tenantId', '==', tenantId)
      .orderBy('timestamp', 'asc')
      .get();
      
    const messages = messagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json(toJSON(messages));
  } catch (error: any) {
    console.error(`[API_TENANT_MESSAGES_GET_ERROR]`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/tenants/{tenantId}/messages
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const landlordId = await getUserIdFromRequest(req);
        if (!landlordId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenantId = params.id;
        const { content } = await req.json();

        if (!content) {
            return NextResponse.json({ error: 'Message content is required.' }, { status: 400 });
        }
        
        const newMessage = {
            tenantId,
            senderId: landlordId,
            senderName: 'Landlord', // In a real app, get this from the user's profile
            content,
            timestamp: FieldValue.serverTimestamp(),
            isRead: false,
        };

        const docRef = await firestore.collection('messages').add(newMessage);
        
        const doc = await docRef.get();
        const createdMessage = { id: doc.id, ...doc.data() };
        
        return NextResponse.json(toJSON(createdMessage), { status: 201 });

    } catch (error: any) {
        console.error(`[API_TENANT_MESSAGES_POST_ERROR]`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
