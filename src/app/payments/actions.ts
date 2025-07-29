
"use server";

import { generateReceipt, type GenerateReceiptInput, type GenerateReceiptOutput } from "@/ai/flows/generate-receipt";

export interface ReceiptState {
    error?: string;
    receipt?: GenerateReceiptOutput;
}

export async function getReceiptAction(input: GenerateReceiptInput): Promise<ReceiptState> {
  try {
    const result = await generateReceipt(input);
    return { receipt: result };
  } catch (error: any) {
    console.error("Failed to generate receipt:", error);
    return {
      error: `Failed to generate receipt: ${error.message}`,
    };
  }
}
