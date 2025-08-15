
'use server';
/**
 * @fileOverview A smart messaging AI agent.
 *
 * - generateMessage - A function that generates contextual messages for tenants.
 * - GenerateMessageInput - The input type for the generateMessage function.
 * - GenerateMessageOutput - The return type for the generateMessage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateMessageInputSchema = z.object({
  tenantName: z.string().describe("The name of the tenant to message."),
  reminderType: z.enum(['rentDue', 'latePayment', 'maintenance']).describe("The type of message to generate."),
});
export type GenerateMessageInput = z.infer<typeof GenerateMessageInputSchema>;

const GenerateMessageOutputSchema = z.object({
  message: z.string().describe('The generated message content.'),
});
export type GenerateMessageOutput = z.infer<typeof GenerateMessageOutputSchema>;

export async function generateMessage(input: GenerateMessageInput): Promise<GenerateMessageOutput> {
  return generateMessageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMessagePrompt',
  input: { schema: GenerateMessageInputSchema },
  output: { schema: GenerateMessageOutputSchema },
  prompt: `You are a friendly and professional property manager. Generate a concise and clear message for the following situation.

Tenant Name: {{{tenantName}}}
Message Type: {{{reminderType}}}

- If the reminderType is 'rentDue', write a friendly reminder that rent is due soon.
- If the reminderType is 'latePayment', write a firm but polite notice that the rent is overdue.
- If the reminderType is 'maintenance', write a general message informing them about upcoming scheduled maintenance in the building next week.

Address the tenant by their name. Keep the tone appropriate for the message type.`,
});


const generateMessageFlow = ai.defineFlow(
  {
    name: 'generateMessageFlow',
    inputSchema: GenerateMessageInputSchema,
    outputSchema: GenerateMessageOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
