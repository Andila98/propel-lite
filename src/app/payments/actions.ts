
"use server";

import { generateReceipt } from '@/ai/flows/generate-receipt';
import { isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import type { GenerateReceiptOutput } from '@/lib/schema-types';
import { ReceiptInputSchema } from '@/lib/schemas';
import type { z } from 'zod';

export interface ReceiptState {
    error?: string;
    receipt?: GenerateReceiptOutput;
}

export async function getReceiptAction(input: z.infer<typeof ReceiptInputSchema>): Promise<ReceiptState> {
    if (!isFirebaseAdminInitialized) {
        console.error('[ERROR: getReceiptAction] Backend services are not configured.');
        return { error: "Backend services are not configured. Please contact support." };
    }
    
    try {
        const receipt = await generateReceipt(input);
        return { receipt };
    } catch (error: any) {
        console.error('[ERROR: getReceiptAction]', error);
        return { error: error.message || "An unknown error occurred" };
    }
}
