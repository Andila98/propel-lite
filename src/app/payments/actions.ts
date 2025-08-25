
"use server";

import { z } from 'zod';
import { generateReceipt } from '@/ai/flows/generate-receipt';
import type { GenerateReceiptOutput } from '@/lib/types';
import { isFirebaseAdminInitialized } from '@/lib/firebase-admin';

export const ReceiptInputSchema = z.object({
    tenantId: z.string(),
    paymentId: z.string(),
});

export interface ReceiptState {
    error?: string;
    receipt?: GenerateReceiptOutput;
}

export async function getReceiptAction(input: z.infer<typeof ReceiptInputSchema>): Promise<ReceiptState> {
    if (!isFirebaseAdminInitialized) {
        console.error('[GET_RECEIPT_ACTION] Backend services are not configured because Firebase Admin is not initialized.');
        return { error: "Backend services are not configured. Please contact support." };
    }
    
    try {
        const receipt = await generateReceipt(input);
        return { receipt };
    } catch (error: any) {
        console.error('[GET_RECEIPT_ACTION_ERROR]', error);
        return { error: error.message || "An unknown error occurred" };
    }
}
