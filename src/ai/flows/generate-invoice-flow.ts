
'use server';
/**
 * @fileOverview A flow to generate a simple rent invoice for a tenant.
 *
 * - generateInvoice - A function that handles invoice generation.
 * - GenerateInvoiceInput - The input type for the function.
 * - GenerateInvoiceOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import {z} from 'genkit';
import { add, format, getDaysInMonth } from 'date-fns';

export const GenerateInvoiceInputSchema = z.object({
  tenantId: z.string().describe("The ID of the tenant for whom to generate an invoice."),
});
export type GenerateInvoiceInput = z.infer<typeof GenerateInvoiceInputSchema>;

const InvoiceItemSchema = z.object({
    description: z.string().describe('Description of the invoice line item (e.g., "Monthly Rent").'),
    amount: z.number().describe('The cost of the line item.'),
});

export const GenerateInvoiceOutputSchema = z.object({
  invoiceNumber: z.string().describe("A unique invoice number, e.g., 'INV-2024-00123'."),
  invoiceDate: z.string().describe("The date the invoice was generated, in ISO 8601 format."),
  dueDate: z.string().describe("The date the payment is due, in ISO 8601 format."),
  tenantName: z.string().describe("The full name of the tenant."),
  propertyAddress: z.string().describe("The full address of the property."),
  items: z.array(InvoiceItemSchema).describe("An array of line items for the invoice."),
  totalAmount: z.number().describe("The total amount due."),
  currency: z.string().describe("The currency of the payment (e.g., KES, USD)."),
  notes: z.string().describe("A brief, courteous note for the tenant, e.g., 'Thank you for your timely payment.'"),
});
export type GenerateInvoiceOutput = z.infer<typeof GenerateInvoiceOutputSchema>;


async function getInvoiceData(input: GenerateInvoiceInput) {
    if (!isFirebaseAdminInitialized) throw new Error("Firebase not initialized.");
    const tenantSnapshot = await firestore.collection('tenants').doc(input.tenantId).get();
    if (!tenantSnapshot.exists) throw new Error('Tenant not found');
    const tenant = tenantSnapshot.data()!;
    
    const propertySnapshot = await firestore.collection('properties').doc(tenant.propertyId).get();
    if (!propertySnapshot.exists) throw new Error('Property not found');
    const property = propertySnapshot.data()!;
    
    const unitSnapshot = await propertySnapshot.ref.collection('units').doc(tenant.currentUnitId).get();
    if (!unitSnapshot.exists) throw new Error('Unit not found');
    const unit = unitSnapshot.data()!;
    
    const now = new Date();
    const invoiceDate = format(now, 'yyyy-MM-dd');
    const dueDate = format(add(now, { days: 5 }), 'yyyy-MM-dd'); // Due in 5 days

    return {
        tenantName: tenant.name,
        propertyAddress: `${property.address}, Unit ${unit.unitNumber}`,
        rentAmount: unit.rent,
        currency: property.currency || 'KES',
        invoiceDate: new Date().toISOString(),
        dueDate: add(new Date(), { days: 5 }).toISOString(),
    };
}


const prompt = ai.definePrompt({
  name: 'generateInvoicePrompt',
  input: {
    schema: z.object({
        tenantName: z.string(),
        propertyAddress: z.string(),
        rentAmount: z.number(),
        currency: z.string(),
        invoiceDate: z.string(),
        dueDate: z.string(),
    })
  },
  output: {schema: GenerateInvoiceOutputSchema},
  prompt: `You are an accounting assistant. Your task is to generate a formal rent invoice.
  
The current month is ${format(new Date(), 'MMMM yyyy')}.
The invoice number should be a unique combination of 'INV-', the current year, and a 4-digit random number.
The invoice should include a line item for the monthly rent.
The total amount is just the rent amount.
Include a polite, standard note for the tenant.

Data:
- Tenant Name: {{tenantName}}
- Property Address: {{propertyAddress}}
- Rent Amount: {{rentAmount}}
- Currency: {{currency}}
- Invoice Date: {{invoiceDate}}
- Due Date: {{dueDate}}
`,
});


export const generateInvoiceFlow = ai.defineFlow(
  {
    name: 'generateInvoiceFlow',
    inputSchema: GenerateInvoiceInputSchema,
    outputSchema: GenerateInvoiceOutputSchema,
  },
  async (input) => {
    try {
        const invoiceData = await getInvoiceData(input);
        const { output } = await prompt(invoiceData);
        return output!;
    } catch (error) {
        console.error('[ERROR: generateInvoiceFlow]', error);
        throw new Error('Failed to generate invoice due to an internal error.');
    }
  }
);

export async function generateInvoice(input: GenerateInvoiceInput): Promise<GenerateInvoiceOutput> {
  return generateInvoiceFlow(input);
}
