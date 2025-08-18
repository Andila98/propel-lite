
'use server';
/**
 * @fileOverview A tenant sentiment analysis AI agent.
 *
 * - summarizeTenantSentiment - A function that analyzes tenant communication.
 * - SummarizeTenantSentimentInput - The input type for the function.
 * - SummarizeTenantSentimentOutput - The return type for the function.
 */

import { ai, handleFlowError } from '@/ai/genkit';
import { z } from 'zod';
import { firestore } from '@/lib/firebase-admin';
import type { Message, Tenant } from '@/lib/types';

const SummarizeTenantSentimentInputSchema = z.object({
  tenantId: z.string().describe("The ID of the tenant."),
});
export type SummarizeTenantSentimentInput = z.infer<typeof SummarizeTenantSentimentInputSchema>;

const SummarizeTenantSentimentOutputSchema = z.object({
  sentiment: z.enum(['Positive', 'Negative', 'Neutral']).describe('The overall sentiment of the tenant.'),
  summary: z.string().describe('A brief summary explaining the sentiment, citing specific interactions if possible.'),
});
export type SummarizeTenantSentimentOutput = z.infer<typeof SummarizeTenantSentimentOutputSchema>;

const summarizeTenantSentimentFlow = ai.defineFlow(
  {
    name: 'summarizeTenantSentimentFlow',
    inputSchema: SummarizeTenantSentimentInputSchema,
    outputSchema: SummarizeTenantSentimentOutputSchema,
  },
  async ({ tenantId }) => {
    try {
      const tenantDoc = await firestore.collection('users').doc(tenantId).get();
      if (!tenantDoc.exists) {
        throw new Error(`Tenant with ID ${tenantId} not found.`);
      }
      const tenant = tenantDoc.data() as Tenant;

      const messagesSnapshot = await firestore.collection('tenants').doc(tenantId).collection('messages').orderBy('timestamp', 'desc').limit(20).get();
      const messages = messagesSnapshot.docs.map(doc => doc.data() as Message);

      const prompt = ai.definePrompt({
        name: 'sentimentAnalysisPrompt',
        output: { schema: SummarizeTenantSentimentOutputSchema },
        prompt: `Analyze the sentiment of the tenant named ${tenant.name} based on the following recent messages. The landlord's messages are from "Landlord", and the tenant's messages are from "${tenant.name}".

        Recent Messages:
        ${messages.map(msg => `${msg.senderName}: ${msg.content}`).join('\n')}

        Based on these messages, determine if the tenant's overall sentiment is Positive, Negative, or Neutral. Provide a brief summary explaining your reasoning. For example, if they are complaining, sentiment is Negative. If they are thankful, it's Positive.`,
      });

      const { output } = await prompt({});
      return output!;
    } catch (error) {
       // Using the centralized error handler
       const flowError = handleFlowError(error, 'summarizeTenantSentimentFlow');
       // Re-throwing a structured error that can be caught by the API route
       throw new Error(flowError.error);
    }
  }
);

export async function summarizeTenantSentiment(
  input: SummarizeTenantSentimentInput
): Promise<SummarizeTenantSentimentOutput> {
  return summarizeTenantSentimentFlow(input);
}
