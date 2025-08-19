
'use server';
/**
 * @fileOverview A flow to generate contextual messages for tenants.
 *
 * - generateMessage - A function that handles message generation.
 * - GenerateMessageInput - The input type for the function.
 * - GenerateMessageOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const GenerateMessageInputSchema = z.object({
  tenantName: z.string().describe("The name of the tenant to address."),
  reminderType: z.string().describe("The context for the message (e.g., 'rentDue', 'latePayment', 'maintenance', 'leaseRenewal')."),
});
export type GenerateMessageInput = z.infer<typeof GenerateMessageInputSchema>;

export const GenerateMessageOutputSchema = z.object({
  message: z.string().describe("The generated, friendly, and professional message content."),
});
export type GenerateMessageOutput = z.infer<typeof GenerateMessageOutputSchema>;


export async function generateMessage(input: GenerateMessageInput): Promise<GenerateMessageOutput> {
  return generateMessageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMessagePrompt',
  input: {schema: GenerateMessageInputSchema},
  output: {schema: GenerateMessageOutputSchema},
  prompt: `You are a helpful property manager's assistant. Your task is to draft a friendly but professional message to a tenant.
  
The tenant's name is {{tenantName}}.
The reason for the message is: {{reminderType}}.

Draft a concise and clear message.

- For 'rentDue', remind them that rent is due soon.
- For 'latePayment', inform them that their rent is overdue and a late fee may apply.
- For 'maintenance', inform them about upcoming scheduled maintenance.
- For 'leaseRenewal', ask if they intend to renew their lease, which is expiring soon.
`,
});

const generateMessageFlow = ai.defineFlow(
  {
    name: 'generateMessageFlow',
    inputSchema: GenerateMessageInputSchema,
    outputSchema: GenerateMessageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
