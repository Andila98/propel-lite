
'use server';
/**
 * @fileOverview An enhanced flow to generate a receipt for a specific payment transaction.
 */

import {ai} from '@/ai/genkit';
import { z } from 'zod';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { 
    GenerateReceiptInputSchema, 
    GenerateReceiptOutputSchema, 
    type GenerateReceiptInput, 
    type GenerateReceiptOutput 
} from '@/lib/schema-types';
import { withErrorHandling } from '@/lib/flow-errors';
import { withMonitoring } from '@/lib/flow-monitor';

interface ReceiptData {
    receiptNumber: string;
    paymentDate: string;
    tenantName: string;
    propertyAddress: string;
    amountPaid: number;
    currency: string;
    paymentMethod: string;
    paymentDescription: string;
}

async function getReceiptData(input: GenerateReceiptInput): Promise<ReceiptData> {
    if (!isFirebaseAdminInitialized) {
        throw new Error("Firebase not initialized.");
    }
    
    const [tenantSnapshot, paymentSnapshot] = await Promise.all([
        firestore.collection('tenants').doc(input.tenantId).get(),
        firestore.collection('payments').doc(input.paymentId).get(),
    ]);
    
    if (!tenantSnapshot.exists) throw new Error('Tenant not found');
    if (!paymentSnapshot.exists) throw new Error('Payment not found');
    
    const tenant = tenantSnapshot.data()!;
    const payment = paymentSnapshot.data()!;
    
    if (payment.tenantId !== input.tenantId) {
        throw new Error('Payment does not belong to the specified tenant');
    }
    
    const propertySnapshot = await firestore.collection('properties').doc(payment.propertyId).get();
    if (!propertySnapshot.exists) throw new Error('Property not found');
    const property = propertySnapshot.data()!;
    
    let unitInfo = '';
    if (tenant.currentUnitId) {
        const unitSnapshot = await propertySnapshot.ref.collection('units').doc(tenant.currentUnitId).get();
        if (unitSnapshot.exists) {
            const unit = unitSnapshot.data()!;
            unitInfo = `, Unit ${unit.unitNumber}`;
        }
    }
    
    // Robust date handling
    let paymentDate: string;
    if (payment.date && typeof (payment.date as any).toDate === 'function') {
        paymentDate = (payment.date as any).toDate().toISOString();
    } else if (typeof payment.date === 'string') {
        paymentDate = new Date(payment.date).toISOString();
    } else {
        paymentDate = new Date().toISOString(); // Fallback
    }
    
    return {
        receiptNumber: `RCPT-${paymentSnapshot.id.substring(0, 8).toUpperCase()}`,
        paymentDate,
        tenantName: tenant.name,
        propertyAddress: `${property.address}${unitInfo}`,
        amountPaid: payment.amount,
        currency: property.currency || 'KES',
        paymentMethod: payment.method,
        paymentDescription: (payment as any).description || 'Monthly Rent Payment',
    };
}


const noteGenerationPrompt = ai.definePrompt({
    name: 'receiptNoteGenerationPrompt',
    input: {
        schema: z.object({
            tenantName: z.string(),
            amountPaid: z.number(),
            currency: z.string(),
            paymentMethod: z.string(),
        })
    },
    output: { schema: z.object({ notes: z.string() }) },
    prompt: `Generate a brief, professional, and courteous thank you note for a receipt.
    
    Tenant Name: {{tenantName}}
    Amount: {{amountPaid}} {{currency}}
    
    Make the note friendly and confirm the payment. Do not include any other details, only the note itself.`,
});


export const generateReceiptFlow = ai.defineFlow(
    {
        name: 'generateReceiptFlow',
        inputSchema: GenerateReceiptInputSchema,
        outputSchema: GenerateReceiptOutputSchema,
    },
    withMonitoring('generateReceiptFlow', withErrorHandling('generateReceiptFlow', async (input) => {
        const receiptData = await getReceiptData(input);
        
        const { output } = await noteGenerationPrompt({
            tenantName: receiptData.tenantName,
            amountPaid: receiptData.amountPaid,
            currency: receiptData.currency,
            paymentMethod: receiptData.paymentMethod,
        });

        const result: GenerateReceiptOutput = {
            ...receiptData,
            notes: output?.notes || `Thank you for your payment of ${receiptData.currency} ${receiptData.amountPaid}.`,
        };
        
        return result;
    }))
);


export async function generateReceipt(input: GenerateReceiptInput): Promise<GenerateReceiptOutput> {
    return generateReceiptFlow(input);
}
