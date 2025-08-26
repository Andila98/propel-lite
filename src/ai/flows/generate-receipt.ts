
'use server';
/**
 * @fileOverview A flow to generate a receipt for a specific payment transaction.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { firestore } from '@/lib/firebase-admin';

export const GenerateReceiptInputSchema = z.object({
    tenantId: z.string(),
    paymentId: z.string(),
});
export type GenerateReceiptInput = z.infer<typeof GenerateReceiptInputSchema>;

export const GenerateReceiptOutputSchema = z.object({
  receiptNumber: z.string().describe("A unique receipt number, e.g., 'RCPT-00123'."),
  paymentDate: z.string().describe("The date the payment was made, in ISO 8601 format."),
  tenantName: z.string().describe("The full name of the tenant."),
  propertyAddress: z.string().describe("The full address of the property."),
  amountPaid: z.number().describe("The amount paid."),
  currency: z.string().describe("The currency of the payment (e.g., KES, USD)."),
  paymentMethod: z.string().describe("The method of payment (e.g., M-Pesa, Stripe)."),
  notes: z.string().describe("A brief, courteous note for the tenant, e.g., 'Thank you for your payment.'"),
});
export type GenerateReceiptOutput = z.infer<typeof GenerateReceiptOutputSchema>;

async function getReceiptData(input: GenerateReceiptInput) {
    const [tenantSnapshot, paymentSnapshot] = await Promise.all([
        firestore.collection('tenants').doc(input.tenantId).get(),
        firestore.collection('payments').doc(input.paymentId).get(),
    ]);

    if (!tenantSnapshot.exists) throw new Error('Tenant not found');
    if (!paymentSnapshot.exists) throw new Error('Payment not found');

    const tenant = tenantSnapshot.data()!;
    const payment = paymentSnapshot.data()!;
    
    const propertySnapshot = await firestore.collection('properties').doc(payment.propertyId).get();
    if (!propertySnapshot.exists) throw new Error('Property not found');
    const property = propertySnapshot.data()!;

    return {
        receiptNumber: `RCPT-${paymentSnapshot.id.substring(0, 6).toUpperCase()}`,
        paymentDate: (payment.date.toDate() as Date).toISOString(),
        tenantName: tenant.name,
        propertyAddress: property.address,
        amountPaid: payment.amount,
        currency: property.currency || 'KES',
        paymentMethod: payment.method,
    };
}


const prompt = ai.definePrompt({
  name: 'generateReceiptPrompt',
  input: {
    schema: z.object({
        receiptNumber: z.string(),
        paymentDate: z.string(),
        tenantName: z.string(),
        propertyAddress: z.string(),
        amountPaid: z.number(),
        currency: z.string(),
        paymentMethod: z.string(),
    })
  },
  output: {schema: GenerateReceiptOutputSchema},
  prompt: `You are an accounting assistant. Your task is to generate a formal receipt based on the provided transaction data.
  
Data:
- Receipt Number: {{receiptNumber}}
- Payment Date: {{paymentDate}}
- Tenant Name: {{tenantName}}
- Property Address: {{propertyAddress}}
- Amount Paid: {{amountPaid}} {{currency}}
- Payment Method: {{paymentMethod}}

Generate the full receipt object. Include a brief, polite thank you note.`,
});


export const generateReceiptFlow = ai.defineFlow(
  {
    name: 'generateReceiptFlow',
    inputSchema: GenerateReceiptInputSchema,
    outputSchema: GenerateReceiptOutputSchema,
  },
  async (input) => {
    try {
        const receiptData = await getReceiptData(input);
        const { output } = await prompt(receiptData);
        return output!;
    } catch (error) {
        console.error('[ERROR: generateReceiptFlow]', error);
        throw new Error('Failed to generate receipt due to an internal error.');
    }
  }
);

export async function generateReceipt(input: GenerateReceiptInput): Promise<GenerateReceiptOutput> {
  return generateReceiptFlow(input);
}

    
