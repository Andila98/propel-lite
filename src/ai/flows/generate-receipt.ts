// This file is machine-generated - edit with caution!
'use server';
/**
 * @fileOverview A flow that generates a receipt for a tenant payment.
 *
 * - generateReceipt - A function that generates receipt data.
 * - GenerateReceiptInput - The input type for the generateReceipt function.
 * - GenerateReceiptOutput - The return type for the generateReceipt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { mockProperties, mockTenants } from '@/lib/mock-data';

const GenerateReceiptInputSchema = z.object({
  tenantId: z.string().describe('The ID of the tenant.'),
  paymentId: z.string().describe('The ID of the payment transaction.'),
});
export type GenerateReceiptInput = z.infer<typeof GenerateReceiptInputSchema>;

const GenerateReceiptOutputSchema = z.object({
  receiptNumber: z.string().describe('A unique receipt number (e.g., RCPT-2024-001).'),
  tenantName: z.string().describe('The name of the tenant.'),
  propertyAddress: z.string().describe('The address of the property.'),
  paymentDate: z.string().describe('The date the payment was made in YYYY-MM-DD format.'),
  paymentMethod: z.string().describe('The method of payment (e.g., ACH, Credit Card).'),
  amountPaid: z.number().describe('The amount paid.'),
  notes: z.string().describe('Any additional notes or comments, like "Thank you for your payment."'),
});
export type GenerateReceiptOutput = z.infer<typeof GenerateReceiptOutputSchema>;

export async function generateReceipt(input: GenerateReceiptInput): Promise<GenerateReceiptOutput> {
  return generateReceiptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateReceiptPrompt',
  input: {schema: z.object({
      tenantName: z.string(),
      propertyAddress: z.string(),
      paymentDate: z.string(),
      paymentMethod: z.string(),
      amountPaid: z.number(),
      currentDate: z.string(),
  })},
  output: {schema: GenerateReceiptOutputSchema},
  prompt: `You are a receipt-generating assistant for a property management company.

  Generate a formal receipt based on the provided details.

  - Tenant Name: {{{tenantName}}}
  - Property Address: {{{propertyAddress}}}
  - Amount Paid: {{{amountPaid}}}
  - Payment Date: {{{paymentDate}}}
  - Payment Method: {{{paymentMethod}}}

  Follow these rules:
  1. Create a unique receipt number starting with 'RCPT-' followed by the year and a 3-digit number (e.g., RCPT-2024-001).
  2. Include a brief, friendly note, such as "Thank you for your payment."
  `,
});

const generateReceiptFlow = ai.defineFlow(
  {
    name: 'generateReceiptFlow',
    inputSchema: GenerateReceiptInputSchema,
    outputSchema: GenerateReceiptOutputSchema,
  },
  async (input) => {
    console.log("Backend: generateReceiptFlow received input:", input);
    const tenant = mockTenants.find(t => t.id === input.tenantId);
    if (!tenant) {
        console.error(`Tenant not found for id: ${input.tenantId}`);
        throw new Error('Tenant not found');
    }
    
    const payment = tenant.paymentHistory.find(p => p.id === input.paymentId);
    if (!payment) {
        console.error(`Payment not found for id: ${input.paymentId}`);
        throw new Error('Payment not found');
    }
    
    const property = mockProperties.find(p => p.id === tenant.propertyId);
    if (!property) {
        console.error(`Property not found for id: ${tenant.propertyId}`);
        throw new Error('Property not found');
    }

    const promptInput = {
        tenantName: tenant.name,
        propertyAddress: property.address,
        paymentDate: payment.date,
        paymentMethod: payment.method,
        amountPaid: payment.amount,
        currentDate: new Date().toISOString().split('T')[0],
    };

    try {
        const {output} = await prompt(promptInput);
        return output!;
    } catch(error) {
        console.error("Backend: Error executing generateReceiptPrompt:", error);
        throw new Error("Failed to generate receipt from AI prompt.");
    }
  }
);
