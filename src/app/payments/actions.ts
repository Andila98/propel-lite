
"use server";

import { z } from 'zod';
import { generateReceipt } from '@/ai/flows/generate-receipt';
import type { GenerateReceiptOutput } from '@/lib/types';

export const ReceiptInputSchema = z.object({
    tenantId: z.string(),
    paymentId: z.string(),
});

export interface ReceiptState {
    error?: string;
    receipt?: GenerateReceiptOutput;
}

export async function getReceiptAction(input: z.infer<typeof ReceiptInputSchema>): Promise<ReceiptState> {
    console.log("Frontend: getReceiptAction called with input:", input);
    try {
        const receipt = await generateReceipt(input);
        return { receipt };
    } catch (error: any) {
        return { error: error.message || "An unknown error occurred" };
    }
}
