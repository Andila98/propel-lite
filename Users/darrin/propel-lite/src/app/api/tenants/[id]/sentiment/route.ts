
'use server';

import { type NextRequest, NextResponse } from 'next/server';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { ai } from '@/ai/genkit';
import { z } from 'zod';

const SentimentAnalysisInputSchema = z.object({
  messages: z.array(z.string()).describe('A list of messages in the conversation thread.')
});

const SentimentAnalysisOutputSchema = z.object({
  sentiment: z.enum(['Positive', 'Neutral', 'Negative']).describe('The overall sentiment of the conversation.'),
  summary: z.string().describe('A 1-2 sentence summary of the key topics discussed and the tenant\'s sentiment.'),
});

const sentimentAnalysisPrompt = ai.definePrompt({
    name: 'sentimentAnalysisPrompt',
    input: { schema: SentimentAnalysisInputSchema },
    output: { schema: SentimentAnalysisOutputSchema },
    prompt: `Analyze the sentiment of the following conversation with a tenant. Determine if the overall sentiment is Positive, Neutral, or Negative. Provide a brief summary of what was discussed.

Conversation:
{{#each messages}}
- {{this}}
{{/each}}
`,
});

async function analyzeSentiment(messages: string[]) {
  const { output } = await sentimentAnalysisPrompt({ messages });
  return output!;
}


export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isFirebaseAdminInitialized) {
      console.error('[API_TENANT_SENTIMENT] Firebase Admin is not initialized.');
      return NextResponse.json({ error: 'Firebase is not initialized. Please check server credentials.' }, { status: 500 });
  }
  try {
    const tenantId = params.id;
    
    // For now, we'll return a placeholder since we don't have a live conversation to analyze.
    // A full implementation would fetch messages from Firestore and pass them to the AI.
    const mockSentiment = {
      sentiment: 'Positive',
      summary: 'Tenant expressed satisfaction with the recent maintenance work. No outstanding issues.'
    };
    
    return NextResponse.json(mockSentiment);

  } catch (error: any) {
    console.error(`[API_TENANT_SENTIMENT_ERROR] Failed to get sentiment for tenant ${params.id}:`, error);
    return NextResponse.json(
      { error: `Failed to analyze sentiment: ${error.message}` },
      { status: 500 }
    );
  }
}
