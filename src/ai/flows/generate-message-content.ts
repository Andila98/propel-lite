
// This file is machine-generated - edit with caution!
'use server';
/**
 * @fileOverview A flow that suggests message content for tenant reminders and notifications.
 *
 * - generateMessageContent - A function that generates message content based on property and tenant data.
 * - GenerateMessageContentInput - The input type for the generateMessageContent function.
 * - GenerateMessageContentOutput - The return type for the generateMessageContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateMessageContentInputSchema = z.object({
  propertyName: z.string().describe('The name of the property.'),
  tenantName: z.string().describe('The name of the tenant.'),
  reminderType: z.enum(['rentDue', 'latePayment', 'maintenance']).describe('The type of reminder or notification.'),
  leaseDetails: z.string().describe('Details about the lease, such as start and end dates, and monthly rent amount.'),
  paymentDetails: z.string().describe('Details about the tenant payments, like last payment date and amount.'),
  propertyDetails: z.string().describe('Details about the property, such as address, number of bedrooms, etc.'),
});
export type GenerateMessageContentInput = z.infer<typeof GenerateMessageContentInputSchema>;

const GenerateMessageContentOutputSchema = z.object({
  messageContent: z.string().describe('The suggested message content for the tenant.'),
});
export type GenerateMessageContentOutput = z.infer<typeof GenerateMessageContentOutputSchema>;

export async function generateMessageContent(input: GenerateMessageContentInput): Promise<GenerateMessageContentOutput> {
  return generateMessageContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMessageContentPrompt',
  input: {schema: GenerateMessageContentInputSchema},
  output: {schema: GenerateMessageContentOutputSchema},
  prompt: `You are a helpful assistant for landlords, skilled at writing effective messages to tenants.

  Based on the following information, generate message content for the tenant.

  Property Name: {{{propertyName}}}
  Tenant Name: {{{tenantName}}}
  Reminder Type: {{{reminderType}}}
  Lease Details: {{{leaseDetails}}}
  Payment Details: {{{paymentDetails}}}
  Property Details: {{{propertyDetails}}}

  Please write a message that is clear, concise, and professional. Tailor the message to the specific reminder type.

  For rentDue reminders, include the amount due and the due date. Crucially, end the message with the placeholder "[Pay Now]" so it can be replaced with a payment button.
  For latePayment notifications, express concern and inquire about the reason for the delay, while also stating late fee policies if applicable.
  For maintenance reminders, provide a heads up regarding the expected maintenance.

  Message Content:`, 
});

const generateMessageContentFlow = ai.defineFlow(
  {
    name: 'generateMessageContentFlow',
    inputSchema: GenerateMessageContentInputSchema,
    outputSchema: GenerateMessageContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
