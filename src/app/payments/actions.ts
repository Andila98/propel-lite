
"use server";

import { z } from 'zod';
import { mockTenants, mockProperties } from '@/lib/mock-data';

export const ReceiptInputSchema = z.object({
    tenantId: z.string(),
    paymentId: z.string(),
});

export const ReceiptOutputSchema = z.object({
  receiptNumber: z.string().describe('A unique receipt number.'),
  paymentDate: z.string().describe('The date of the payment in YYYY-MM-DD format.'),
  tenantName: z.string().describe('The full name of the tenant.'),
  propertyAddress: z.string().describe('The full address of the property.'),
  amountPaid: z.number().describe('The amount paid.'),
  currency: z.string().describe('The currency of the payment (e.g., KES, USD).'),
  paymentMethod: z.string().describe('The method used for payment (e.g., M-Pesa, Stripe).'),
  notes: z.string().describe('Any additional notes, like "Thank you for your payment."'),
});

export type GenerateReceiptOutput = z.infer<typeof ReceiptOutputSchema>;

export interface ReceiptState {
    error?: string;
    receipt?: GenerateReceiptOutput;
}

export async function getReceiptAction(input: z.infer<typeof ReceiptInputSchema>): Promise<ReceiptState> {
    console.log("Frontend: getReceiptAction called with input:", input);
    try {
        const tenant = mockTenants.find(t => t.id === input.tenantId);
        if (!tenant) throw new Error("Tenant not found");
        
        const payment = tenant.paymentHistory.find(p => p.id === input.paymentId);
        if (!payment) throw new Error("Payment not found");

        const property = mockProperties.find(p => p.id === payment?.propertyId);
        if (!property) throw new Error("Property not found");

        const receipt: GenerateReceiptOutput = {
            receiptNumber: `RCPT-${Math.floor(Math.random() * 90000) + 10000}`,
            paymentDate: new Date(payment?.date as string).toISOString().split('T')[0],
            tenantName: tenant?.name,
            propertyAddress: property?.address,
            amountPaid: payment?.amount,
            currency: property?.currency || 'KES',
            paymentMethod: payment?.method,
            notes: "Thank you for your timely payment. This receipt confirms your transaction."
        };
        
        return { receipt };

    } catch (error: any) {
        return { error: error.message || "An unknown error occurred" };
    }
}
