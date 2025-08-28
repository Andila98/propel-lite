
import { NextResponse, type NextRequest } from 'next/server';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { toJSON } from '@/lib/utils';
import { verifySession } from '@/lib/auth-utils';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

// GET /api/tenants/{tenantId}/messages
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isFirebaseAdminInitialized) {
    return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 500 });
  }
  const claims = await verifySession(req);
    if (!claims) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const landlordId = claims.role === 'manager' ? claims.landlordId : claims.uid;

  try {
    const tenantId = params.id;
    const tenantDoc = await firestore.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists || tenantDoc.data()?.landlordId !== landlordId) {
        return NextResponse.json({ error: 'Tenant not found or access denied.' }, { status: 404 });
    }
    
    const messagesSnapshot = await firestore.collection('messages')
      .where('tenantId', '==', tenantId)
      .orderBy('timestamp', 'asc')
      .get();
      
    const messages = messagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json(toJSON(messages));
  } catch (error: any) {
    console.error(`[ERROR: /api/tenants/{id}/messages GET]`, error);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}

// POST /api/tenants/{tenantId}/messages
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    if (!isFirebaseAdminInitialized) {
        return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 500 });
    }
    try {
        const claims = await verifySession(req);
        if (!claims) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const landlordId = claims.role === 'manager' ? claims.landlordId : claims.uid;

        const tenantId = params.id;
        const { content } = await req.json();

        if (!content) {
            return NextResponse.json({ error: 'Message content is required.' }, { status: 400 });
        }

        const tenantDoc = await firestore.collection('tenants').doc(tenantId).get();
        if (!tenantDoc.exists || tenantDoc.data()?.landlordId !== landlordId) {
            return NextResponse.json({ error: 'Tenant not found or access denied.' }, { status: 404 });
        }
        
        const newMessage = {
            tenantId,
            senderId: claims.uid,
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
        console.error(`[ERROR: /api/tenants/{id}/messages POST]`, error);
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}
