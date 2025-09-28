
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
import { logActivity } from '@/lib/audit-log-service';
import { getLandlordAndActor } from '@/lib/auth-utils';
import { cookies } from 'next/headers';
import { authConfig } from '@/config/server-config';
import type { Payment, Timestamp, DocumentData } from 'firebase-admin/firestore';

// Extended interface for receipt data
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
    
    const tenant = tenantSnapshot.data() as DocumentData;
    const payment = paymentSnapshot.data() as Payment & { date: Timestamp, description?: string };
    
    // Validate tenant-payment relationship
    if (payment.tenantId !== input.tenantId) {
        throw new Error('Payment does not belong to the specified tenant');
    }
    
    const propertySnapshot = await firestore.collection('properties').doc(payment.propertyId).get();
    if (!propertySnapshot.exists) throw new Error('Property not found');
    const property = propertySnapshot.data()!;
    
    let unitInfo = '';
    if (tenant.currentUnitId) {
        try {
            // Use payment.propertyId which is guaranteed to be correct for this payment
            const unitSnapshot = await firestore.collection('properties').doc(payment.propertyId).collection('units').doc(tenant.currentUnitId).get();
            if (unitSnapshot.exists) {
                const unit = unitSnapshot.data()!;
                unitInfo = `, Unit ${unit.unitNumber}`;
            }
        } catch (error) {
            console.warn('Could not retrieve unit information:', error);
        }
    }
    
    let paymentDate: string;
    try {
        if (payment.date && typeof (payment.date as Timestamp).toDate === 'function') {
            paymentDate = (payment.date as Timestamp).toDate().toISOString();
        } else if (typeof payment.date === 'string') {
            paymentDate = new Date(payment.date).toISOString();
        } else {
            console.warn('Payment date not found or invalid, using current date');
            paymentDate = new Date().toISOString();
        }
    } catch (error) {
        console.warn('Error parsing payment date:', error);
        paymentDate = new Date().toISOString();
    }
    
    return {
        receiptNumber: `RCPT-${paymentSnapshot.id.substring(0, 8).toUpperCase()}`,
        paymentDate,
        tenantName: tenant.name || 'Unknown Tenant',
        propertyAddress: `${property.address || 'Unknown Address'}${unitInfo}`,
        amountPaid: payment.amount || 0,
        currency: property.currency || 'KES',
        paymentMethod: payment.method || 'Unknown',
        paymentDescription: payment.description || 'Monthly Rent Payment',
    };
}


const noteGenerationPrompt = ai.definePrompt({
    name: 'receiptNoteGenerationPrompt',
    input: {
        schema: z.object({
            tenantName: z.string(),
            amountPaid: z.number(),
            currency: z.string(),
        })
    },
    output: { schema: z.object({ notes: z.string() }) },
    prompt: `Generate a brief, professional, and courteous thank you note for a payment receipt.
    
    Context:
    - Tenant: {{tenantName}}
    - Amount: {{amountPaid}} {{currency}}
    
    Requirements:
    - Keep it under 40 words.
    - Be warm but professional.
    - Thank them for the payment.
    
    Example: "Thank you for your payment of {{amountPaid}} {{currency}}. We appreciate your promptness and value you as a tenant."`,
    config: {
        temperature: 0.3,
        timeout: 10000,
    },
});

function generateFallbackNote(data: ReceiptData): string {
    return `Thank you for your payment of ${data.currency} ${data.amountPaid.toLocaleString()}. We appreciate your promptness and value you as a tenant.`;
}

export const generateReceiptFlow = ai.defineFlow(
    {
        name: 'generateReceiptFlow',
        inputSchema: GenerateReceiptInputSchema,
        outputSchema: GenerateReceiptOutputSchema,
    },
    withMonitoring('generateReceiptFlow', withErrorHandling('generateReceiptFlow', async (input) => {
        
        const receiptData = await getReceiptData(input);
        
        let notes: string;
        try {
            const { output } = await noteGenerationPrompt({
                tenantName: receiptData.tenantName,
                amountPaid: receiptData.amountPaid,
                currency: receiptData.currency,
            });
            notes = output?.notes || generateFallbackNote(receiptData);
        } catch (aiError) {
            console.warn('AI note generation failed, using fallback:', aiError);
            notes = generateFallbackNote(receiptData);
        }
        
        const result: GenerateReceiptOutput = {
            ...receiptData,
            notes,
        };
        
        try {
            const sessionCookie = cookies().get(authConfig.cookieName)?.value;
            const { actor, landlordId } = await getLandlordAndActor(sessionCookie || '');
            if (actor && landlordId) {
                 await logActivity(actor.displayName || 'System', `Generated receipt ${result.receiptNumber} for tenant "${result.tenantName}"`, { type: 'Tenant', name: result.tenantName }, landlordId);
            }
        } catch (auditError: unknown) {
            console.error('Failed to create audit trail:', auditError);
        }
        
        return result;
    }))
);


export async function generateReceipt(input: GenerateReceiptInput): Promise<GenerateReceiptOutput> {
    return generateReceiptFlow(input);
}
