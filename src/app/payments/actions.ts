
"use server";

import type { GenerateReceiptOutput } from '@/ai/flows/generate-receipt';


export interface ReceiptState {
    error?: string;
    receipt?: any;
}

export async function getReceiptAction(input: any): Promise<ReceiptState> {
  console.log("Frontend: getReceiptAction called with input:", input);
  return {
      error: `AI features are not configured.`,
  };
}
