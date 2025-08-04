
import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import type { Message, Tenant } from '@/lib/types';
import { summarizeTenantSentiment } from '@/ai/flows/summarize-tenant-sentiment';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = params.id;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }
    console.log(`API: Getting sentiment for tenant ${tenantId}.`);

    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) {
        console.error(`API Error: Tenant not found for ID: ${tenantId}`);
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
        console.log(`API: No messages found for tenant ${tenantId}. Returning Neutral sentiment.`);
        return NextResponse.json({ sentiment: 'Neutral', summary: 'No messages found to analyze sentiment.' });
    }

    const sentimentInput = {
      messages: messages.map(m => ({ senderName: m.senderName, content: m.content })),
      tenantName: tenant.name || 'the tenant',
    };

    const sentimentResult = await summarizeTenantSentiment(sentimentInput);
    console.log(`API: Sentiment analysis successful for tenant ${tenantId}. Result: ${sentimentResult.sentiment}`);
    
    return NextResponse.json(sentimentResult);
  } catch (error: any) {
    console.error(`API Error: Failed to get sentiment for tenant ${params.id}:`, error);
    return NextResponse.json(
      { error: `Failed to analyze sentiment: ${error.message}` },
      { status: 500 }
    );
  }
}
