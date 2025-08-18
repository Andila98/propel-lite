
'use server';
/**
 * @fileOverview An AI agent for generating invoices.
 *
 * - generateInvoice - A function that creates an invoice for a tenant.
 * - GenerateInvoiceInput - The input type for the function.
 * - GenerateInvoiceOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { firestore } from '@/lib/firebase-admin';
import { z } from 'zod';
import type { Tenant, Property } from '@/lib/types';
import { format } from 'date-fns';

export const GenerateInvoiceInputSchema = z.object({
  tenantId: z.string().describe("The ID of the tenant for whom to generate an invoice."),
});
export type GenerateInvoiceInput = z.infer<typeof GenerateInvoiceInputSchema>;

export const GenerateInvoiceOutputSchema = z.object({
  invoiceNumber: z.string().describe('A unique invoice number, e.g., "INV-2024-001".'),
  invoiceDate: z.string().describe('The date the invoice was generated, in YYYY-MM-DD format.'),
  dueDate: z.string().describe('The date the payment is due, in YYYY-MM-DD format.'),
  tenantName: z.string().describe('The full name of the tenant.'),
  propertyAddress: z.string().describe('The full address of the property.'),
  items: z.array(z.object({
    description: z.string().describe('Description of the line item (e.g., "Monthly Rent for July 2024").'),
    amount: z.number().describe('The cost of the line item.'),
  })).describe('A list of items included in the invoice.'),
  totalAmount: z.number().describe('The total amount due.'),
  currency: z.string().describe('The currency code for the amounts (e.g., KES, USD).'),
  notes: z.string().describe('Any additional notes or payment instructions.'),
});
export type GenerateInvoiceOutput = z.infer<typeof GenerateInvoiceOutputSchema>;


const generateInvoiceFlow = ai.defineFlow(
  {
    name: 'generateInvoiceFlow',
    inputSchema: GenerateInvoiceInputSchema,
    outputSchema: GenerateInvoiceOutputSchema,
  },
  async ({ tenantId }) => {
    
    const tenantDoc = await firestore.collection('users').doc(tenantId).get();
    if (!tenantDoc.exists) {
        throw new Error(`Tenant with ID ${tenantId} not found.`);
    }
    const tenant = tenantDoc.data() as Tenant;

    const propertyDoc = await firestore.collection('properties').doc(tenant.propertyId).get();
    if (!propertyDoc.exists) {
        throw new Error(`Property with ID ${tenant.propertyId} not found.`);
    }
    const property = propertyDoc.data() as Property;
    const unitDoc = await firestore.collection('properties').doc(tenant.propertyId).collection('units').doc(tenant.currentUnitId!).get();
    const unit = unitDoc.data();
    
    if (!unit) {
         throw new Error(`Unit with ID ${tenant.currentUnitId} not found.`);
    }

    const today = new Date();
    const dueDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    
    const prompt = ai.definePrompt({
        name: 'generateInvoicePrompt',
        output: { schema: GenerateInvoiceOutputSchema },
        prompt: `You are an accounting assistant for a property management company. Your task is to generate a professional invoice.

        Tenant Details:
        - Name: ${tenant.name}
        - Property Address: ${property.address}
        - Unit Number: ${unit.unitNumber}
        - Monthly Rent: ${unit.rent} ${property.currency}

        Invoice Details:
        - Today's Date: ${format(today, 'yyyy-MM-dd')}
        - Due Date: ${format(dueDate, 'yyyy-MM-dd')}
        - The invoice is for the upcoming month's rent.
        - Create a unique invoice number.
        - Add a friendly note with payment instructions.
        - The only line item should be for the rent of the upcoming month.
        `,
    });

    const { output } = await prompt({});
    return output!;
  }
);


export async function generateInvoice(input: GenerateInvoiceInput): Promise<GenerateInvoiceOutput> {
    return generateInvoiceFlow(input);
}
