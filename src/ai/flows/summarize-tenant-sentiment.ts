
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
import type { Message } from '@/lib/types';

const SummarizeTenantSentimentInputSchema = z.object({
  messages: z.array(z.object({
      senderName: z.string(),
      content: z.string(),
  })).describe("A list of messages in a conversation thread."),
  tenantName: z.string().describe("The name of the tenant in the conversation."),
});
export type SummarizeTenantSentimentInput = z.infer<typeof SummarizeTenantSentimentInputSchema>;

const SummarizeTenantSentimentOutputSchema = z.object({
  sentiment: z.enum(['Positive', 'Neutral', 'Negative']).describe("The overall sentiment of the conversation."),
  summary: z.string().describe("A brief summary explaining the sentiment, highlighting key topics or concerns."),
});
export type SummarizeTenantSentimentOutput = z.infer<typeof SummarizeTenantSentimentOutputSchema>;

export async function summarizeTenantSentiment(input: SummarizeTenantSentimentInput): Promise<SummarizeTenantSentimentOutput> {
  console.log("Backend: summarizeTenantSentiment flow received input for tenant:", input.tenantName);
  try {
    return await summarizeTenantSentimentFlow(input);
  } catch (error) {
      console.error("Backend Error: Failed to summarize tenant sentiment:", error);
      throw new Error("An error occurred during sentiment analysis.");
  }
}

const prompt = ai.definePrompt({
  name: 'summarizeTenantSentimentPrompt',
  input: {schema: SummarizeTenantSentimentInputSchema},
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
    const {output} = await prompt(input);
    return output!;
  }
);
