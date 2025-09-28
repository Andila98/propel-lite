

import { NextResponse, type NextRequest } from 'next/server';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { toJSON } from '@/lib/utils';
import { verifySession } from '@/lib/auth-utils';
import { FieldValue } from 'firebase-admin/firestore';
import { authConfig } from '@/config/server-config';

export const runtime = 'nodejs';

// GET /api/tenants/{tenantId}/messages
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isFirebaseAdminInitialized) {
    return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 500 });
  }
  const sessionCookie = req.cookies.get(authConfig.cookieName)?.value;
  const claims = await verifySession(sessionCookie);
    if (!claims) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
  try {
    const tenantId = params.id;
    // For tenants, they can only get their own messages
    // For landlords/managers, they need to verify ownership
    if (claims.role === 'tenant' && claims.uid !== tenantId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (claims.role !== 'tenant') {
        const landlordId = claims.role === 'manager' ? claims.landlordId : claims.uid;
        const tenantDoc = await firestore.collection('tenants').doc(tenantId).get();
        if (!tenantDoc.exists || tenantDoc.data()?.landlordId !== landlordId) {
            return NextResponse.json({ error: 'Tenant not found or access denied.' }, { status: 404 });
        }
    }
    
    const messagesSnapshot = await firestore.collection('messages')
      .where('tenantId', '==', tenantId)
      .orderBy('timestamp', 'asc')
      .get();
      
    const messages = messagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json(toJSON(messages));
  } catch (error: unknown) {
    const typedError = error as Error;
    console.error(`[ERROR: /api/tenants/{id}/messages GET]`, typedError);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}

// POST /api/tenants/{tenantId}/messages
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    if (!isFirebaseAdminInitialized) {
        return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 500 });
    }

    const { content } = await req.json();

    if (!content) {
        return NextResponse.json({ error: 'Message content is required.' }, { status: 400 });
    }
    
    const sessionCookie = req.cookies.get(authConfig.cookieName)?.value;
    const claims = await verifySession(sessionCookie);
    if (!claims) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const tenantId = params.id;
        let senderName = "User";

        if (claims.role === 'tenant' && claims.uid !== tenantId) {
            return NextResponse.json({ error: 'Forbidden: You can only send messages for yourself.' }, { status: 403 });
        } else if (claims.role === 'landlord') {
            senderName = "Landlord";
        } else if (claims.role === 'manager') {
            senderName = "Manager";
        }
        
        if (claims.role !== 'tenant') {
            const landlordId = claims.role === 'manager' ? claims.landlordId : claims.uid;
            const tenantDoc = await firestore.collection('tenants').doc(tenantId).get();
            if (!tenantDoc.exists || tenantDoc.data()?.landlordId !== landlordId) {
                return NextResponse.json({ error: 'Tenant not found or access denied.' }, { status: 404 });
            }
        }
        
        const newMessage = {
            tenantId,
            senderId: claims.uid,
            senderName,
            content,
            timestamp: FieldValue.serverTimestamp(),
            isRead: false,
        };

        const docRef = await firestore.collection('messages').add(newMessage);
        
        const doc = await docRef.get();
        const createdMessage = { id: doc.id, ...doc.data() };
        
        return NextResponse.json(toJSON(createdMessage), { status: 201 });

    } catch (error: unknown) {
        const typedError = error as Error;
        console.error(`[ERROR: /api/tenants/{id}/messages POST]`, typedError);
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}
