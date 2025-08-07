
// This file is machine-generated - edit with caution!
'use server';
/**
 * @fileOverview A flow that generates an invoice for a tenant.
 *
 * - generateInvoice - A function that generates invoice data.
 * - GenerateInvoiceInput - The input type for the generateInvoice function.
 * - GenerateInvoiceOutput - The return type for the generateInvoice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { db } from '@/lib/firebase-admin';
import type { Tenant, Property, Unit } from '@/lib/types';

const GenerateInvoiceInputSchema = z.object({
  tenantId: z.string().describe('The ID of the tenant.'),
  propertyId: z.string().describe('The ID of the property.'),
  dueDate: z.string().describe('The due date for the invoice in YYYY-MM-DD format.'),
});
export type GenerateInvoiceInput = z.infer<typeof GenerateInvoiceInputSchema>;

const InvoiceItemSchema = z.object({
    description: z.string().describe("Description of the line item (e.g., 'Monthly Rent')."),
    amount: z.number().describe('The cost of the line item.'),
});

const GenerateInvoiceOutputSchema = z.object({
  invoiceNumber: z.string().describe('A unique invoice number (e.g., INV-2024-001).'),
  tenantName: z.string().describe('The name of the tenant.'),
  propertyAddress: z.string().describe('The address of the property.'),
  invoiceDate: z.string().describe('The date the invoice was generated in YYYY-MM-DD format.'),
  dueDate: z.string().describe('The due date for the payment in YYYY-MM-DD format.'),
  items: z.array(InvoiceItemSchema).describe('An array of line items for the invoice.'),
  totalAmount: z.number().describe('The total amount due.'),
  notes: z.string().describe('Any additional notes or comments for the tenant.'),
  currency: z.string().describe("The currency symbol (e.g., '$', '€', 'Ksh')."),
});
export type GenerateInvoiceOutput = z.infer<typeof GenerateInvoiceOutputSchema>;

export async function generateInvoice(input: GenerateInvoiceInput): Promise<GenerateInvoiceOutput> {
  return generateInvoiceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateInvoicePrompt',
  input: {schema: z.object({
      tenantName: z.string(),
      propertyAddress: z.string(),
      rentAmount: z.number(),
      dueDate: z.string(),
      currentDate: z.string(),
      currency: z.string(),
  })},
  output: {schema: GenerateInvoiceOutputSchema},
  prompt: `You are an invoicing assistant for a property management company.

  Generate a formal invoice based on the provided details.

  - Tenant Name: {{{tenantName}}}
  - Property Address: {{{propertyAddress}}}
  - Rent Amount: {{{rentAmount}}}
  - Currency: {{{currency}}}
  - Invoice Date: {{{currentDate}}}
  - Due Date: {{{dueDate}}}

  Follow these rules:
  1. Create a unique invoice number starting with 'INV-' followed by the year and a 3-digit number (e.g., INV-2024-001).
  2. The line items should include one item for 'Monthly Rent'.
  3. The total amount should be the sum of all line items.
  4. The currency must be {{{currency}}}.
  5. Include a brief, friendly note, such as "Thank you for your timely payment. We appreciate having you as a tenant."
  `,
});

const generateInvoiceFlow = ai.defineFlow(
  {
    name: 'generateInvoiceFlow',
    inputSchema: GenerateInvoiceInputSchema,
    outputSchema: GenerateInvoiceOutputSchema,
  },
  async (input) => {
    console.log("Backend: generateInvoiceFlow received input:", input);
    const tenantDoc = await db.collection('users').doc(input.tenantId).get();
    const propertyDoc = await db.collection('properties').doc(input.propertyId).get();

    if (!tenantDoc.exists || !propertyDoc.exists) {
      const errorMessage = `Tenant or Property not found for tenantId: ${input.tenantId}, propertyId: ${input.propertyId}`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
    
    const tenant = tenantDoc.data() as Tenant;
    const property = propertyDoc.data() as Property;
    
    if (!tenant.currentUnitId) {
        throw new Error(`Tenant with ID ${tenant.uid} is not assigned to a unit.`);
    }

    const unitSnapshot = await db.collection('properties').doc(input.propertyId).collection('units').doc(tenant.currentUnitId).get();
    if (!unitSnapshot.exists) {
        throw new Error(`Unit with ID ${tenant.currentUnitId} not found.`);
    }
    const unit = unitSnapshot.data() as Unit;

    const promptInput = {
        tenantName: tenant.name,
        propertyAddress: property.address,
        rentAmount: unit.rent,
        dueDate: input.dueDate,
        currentDate: new Date().toISOString().split('T')[0],
        currency: (property as any).currency || 'Ksh',
    };

    try {
        const {output} = await prompt(promptInput);
        return output!;
    } catch (error) {
        console.error("Backend: Error executing generateInvoicePrompt:", error);
        throw new Error("Failed to generate invoice from AI prompt.");
    }
  }
);
