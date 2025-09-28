
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
import {z} from 'zod';
import { add, format } from 'date-fns';
import { GenerateInvoiceInputSchema, GenerateInvoiceOutputSchema, type GenerateInvoiceInput, type GenerateInvoiceOutput } from '@/lib/schema-types';
import { withErrorHandling } from '@/lib/flow-errors';
import { withMonitoring } from '@/lib/flow-monitor';


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
    const invoiceNumber = `INV-${format(now, 'yyyy')}-${Math.floor(1000 + Math.random() * 9000)}`;

    return {
        invoiceNumber,
        tenantName: tenant.name,
        propertyAddress: `${property.address}, Unit ${unit.unitNumber}`,
        rentAmount: unit.rent,
        currency: property.currency || 'KES',
    };
}


const prompt = ai.definePrompt({
  name: 'generateInvoicePrompt',
  input: {
    schema: z.object({
        invoiceNumber: z.string(),
        tenantName: z.string(),
        propertyAddress: z.string(),
        rentAmount: z.number(),
        currency: z.string(),
    })
  },
  output: {schema: GenerateInvoiceOutputSchema},
  prompt: `You are an accounting assistant. Your task is to generate a formal rent invoice.
  
The current month is ${format(new Date(), 'MMMM yyyy')}.
The invoice should include a line item for the monthly rent.
The total amount is just the rent amount.
Include a polite, standard note for the tenant.

Data:
- Invoice Number: {{invoiceNumber}}
- Tenant Name: {{tenantName}}
- Property Address: {{propertyAddress}}
- Rent Amount: {{rentAmount}}
- Currency: {{currency}}
- Invoice Date: ${new Date().toISOString()}
- Due Date: ${add(new Date(), { days: 5 }).toISOString()}
`,
});


export const generateInvoiceFlow = ai.defineFlow(
  {
    name: 'generateInvoiceFlow',
    inputSchema: GenerateInvoiceInputSchema,
    outputSchema: GenerateInvoiceOutputSchema,
  },
  withMonitoring('generateInvoiceFlow', withErrorHandling('generateInvoiceFlow', async (input) => {
    const invoiceData = await getInvoiceData(input);
    const { output } = await prompt(invoiceData);
    return output!;
  }))
);

export async function generateInvoice(input: GenerateInvoiceInput): Promise<GenerateInvoiceOutput> {
  return generateInvoiceFlow(input);
}
