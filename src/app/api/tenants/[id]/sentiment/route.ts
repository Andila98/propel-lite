
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

    const sentimentResult = await summarizeTenantSentiment({ tenantId });
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
