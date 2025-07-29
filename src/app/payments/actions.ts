
"use server";

import { generateReceipt, type GenerateReceiptInput, type GenerateReceiptOutput } from "@/ai/flows/generate-receipt";

export interface ReceiptState {
    error?: string;
    receipt?: GenerateReceiptOutput;
}

export async function getReceiptAction(input: GenerateReceiptInput): Promise<ReceiptState> {
  console.log("Frontend: getReceiptAction called with input:", input);
  try {
    const result = await generateReceipt(input);
    console.log("Frontend: Receipt generated successfully:", result);
    return { receipt: result };
  } catch (error: any) {
    console.error("Frontend: Failed to generate receipt:", error);
    return {
      error: `Failed to generate receipt: ${error.message}`,
    };
  }
}
