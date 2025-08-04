
import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import type { Message, Tenant } from '@/lib/types';
import { summarizeTenantSentiment } from '@/ai/flows/summarize-tenant-sentiment';

export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const tenantId = params.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) {
        return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }
    const tenant = tenantDoc.data() as Tenant;

    const messagesSnapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('messages')
      .orderBy('timestamp', 'asc')
      .limit(20) // Limit to the last 20 messages to keep it concise
      .get();
      
    const messages = messagesSnapshot.docs.map(doc => doc.data() as Message);
    
    if (messages.length === 0) {
        return NextResponse.json({ sentiment: 'Neutral', summary: 'No messages found to analyze sentiment.' });
    }

    const sentimentInput = {
      messages: messages.map(m => ({ senderName: m.senderName, content: m.content })),
      tenantName: tenant.name || 'the tenant',
    };

    const sentimentResult = await summarizeTenantSentiment(sentimentInput);

    return NextResponse.json(sentimentResult);
  } catch (error: any) {
    console.error(`API Error: Failed to get sentiment for tenant ${params.tenantId}:`, error);
    return NextResponse.json(
      { error: `Failed to analyze sentiment: ${error.message}` },
      { status: 500 }
    );
  }
}
