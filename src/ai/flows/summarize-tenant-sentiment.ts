
'use server';
/**
 * @fileOverview An AI flow to analyze and summarize tenant sentiment from messages.
 *
 * - summarizeTenantSentiment - A function that analyzes a conversation and returns a sentiment summary.
 * - SummarizeTenantSentimentInput - The input type for the summarizeTenantSentiment function.
 * - SummarizeTenantSentimentOutput - The return type for the summarizeTenantSentiment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { db } from '@/lib/firebase-admin';
import type { Message, Tenant } from '@/lib/types';

const SummarizeTenantSentimentInputSchema = z.object({
  tenantId: z.string().describe("The ID of the tenant."),
});
export type SummarizeTenantSentimentInput = z.infer<typeof SummarizeTenantSentimentInputSchema>;

const SummarizeTenantSentimentOutputSchema = z.object({
  sentiment: z.enum(['Positive', 'Neutral', 'Negative']).describe("The overall sentiment of the conversation."),
  summary: z.string().describe("A brief summary explaining the sentiment, highlighting key topics or concerns."),
});
export type SummarizeTenantSentimentOutput = z.infer<typeof SummarizeTenantSentimentOutputSchema>;

export async function summarizeTenantSentiment(input: SummarizeTenantSentimentInput): Promise<SummarizeTenantSentimentOutput> {
  try {
    return await summarizeTenantSentimentFlow(input);
  } catch (error: any) {
      console.error(`[summarizeTenantSentiment] Error: Failed to summarize sentiment for tenant ${input.tenantId}`, error);
      throw new Error(`Failed to summarize tenant sentiment: ${error.message}`);
  }
}

const prompt = ai.definePrompt({
  name: 'summarizeTenantSentimentPrompt',
  input: {schema: z.object({
      messages: z.array(z.object({
          senderName: z.string(),
          content: z.string(),
      })),
      tenantName: z.string(),
  })},
  output: {schema: SummarizeTenantSentimentOutputSchema},
  prompt: `You are a sentiment analysis expert specializing in landlord-tenant communications.
  Your task is to analyze the following conversation with a tenant named {{{tenantName}}} and determine their overall sentiment.

  Conversation History:
  {{#each messages}}
  - {{{senderName}}}: "{{{content}}}"
  {{/each}}

  Instructions:
  1.  Read the entire conversation carefully.
  2.  Determine if the tenant's overall sentiment is 'Positive', 'Neutral', or 'Negative'.
  3.  Provide a concise summary that justifies your sentiment rating. Mention any specific issues (e.g., maintenance requests, payment problems) or positive interactions.
  4.  Focus on the tenant's perspective and feelings.

  Example Output for a negative sentiment:
  {
    "sentiment": "Negative",
    "summary": "The tenant, Jane, is expressing frustration over a recurring plumbing issue and a delayed response to her maintenance requests. Her tone indicates dissatisfaction."
  }
  `,
});

const summarizeTenantSentimentFlow = ai.defineFlow(
  {
    name: 'summarizeTenantSentimentFlow',
    inputSchema: SummarizeTenantSentimentInputSchema,
    outputSchema: SummarizeTenantSentimentOutputSchema,
  },
  async (input) => {
    const { tenantId } = input;
    
    const tenantDoc = await db.collection('users').doc(tenantId).get();
    if (!tenantDoc.exists) {
        throw new Error('Tenant not found');
    }
    const tenant = tenantDoc.data() as Tenant;

    const messagesSnapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('messages')
      .orderBy('timestamp', 'asc')
      .limit(20)
      .get();
      
    const messages = messagesSnapshot.docs.map(doc => doc.data() as Message);

    if (messages.length === 0) {
        return { sentiment: 'Neutral', summary: 'No messages found to analyze sentiment.' };
    }

    const promptInput = {
      messages: messages.map(m => ({ senderName: m.senderName, content: m.content })),
      tenantName: tenant.name,
    };
    
    const {output} = await prompt(promptInput);
    return output!;
  }
);
