
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
import { db } from '@/lib/firebase-admin';
import type { Tenant, Property, Payment } from '@/lib/types';


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
  currency: z.string().describe("The currency symbol (e.g., '$', '€', 'Ksh')."),
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
      currency: z.string(),
  })},
  output: {schema: GenerateReceiptOutputSchema},
  prompt: `You are a receipt-generating assistant for a property management company.

  Generate a formal receipt based on the provided details.

  - Tenant Name: {{{tenantName}}}
  - Property Address: {{{propertyAddress}}}
  - Amount Paid: {{{amountPaid}}}
  - Payment Date: {{{paymentDate}}}
  - Payment Method: {{{paymentMethod}}}
  - Currency: {{{currency}}}

  Follow these rules:
  1. Create a unique receipt number starting with 'RCPT-' followed by the year and a 3-digit number (e.g., RCPT-2024-001).
  2. The currency must be {{{currency}}}.
  3. Include a brief, friendly note, such as "Thank you for your payment."
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
    const tenantDoc = await db.collection('users').doc(input.tenantId).get();
    if (!tenantDoc.exists) {
        console.error(`Tenant not found for id: ${input.tenantId}`);
        throw new Error('Tenant not found');
    }
    const tenant = tenantDoc.data() as Tenant;
    
    const paymentDoc = await db.collection('payments').doc(input.paymentId).get();
    if (!paymentDoc.exists) {
        console.error(`Payment not found for id: ${input.paymentId}`);
        throw new Error('Payment not found');
    }
    const payment = paymentDoc.data() as Payment;

    if (payment.tenantId !== input.tenantId) {
        throw new Error("Payment does not belong to the specified tenant.");
    }
    
    const propertyDoc = await db.collection('properties').doc(payment.propertyId).get();
    if (!propertyDoc.exists) {
        console.error(`Property not found for id: ${payment.propertyId}`);
        throw new Error('Property not found');
    }
    const property = propertyDoc.data() as Property;

    const promptInput = {
        tenantName: tenant.name,
        propertyAddress: property.address,
        paymentDate: new Date(payment.paidAt.seconds * 1000).toISOString().split('T')[0],
        paymentMethod: payment.method,
        amountPaid: payment.amount,
        currentDate: new Date().toISOString().split('T')[0],
        currency: (property as any).currency || 'Ksh',
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
