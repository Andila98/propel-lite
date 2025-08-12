
"use server";

import { generateReceipt, type GenerateReceiptInput, type GenerateReceiptOutput } from "@/ai/flows/generate-receipt";
import { getTokens } from "next-firebase-auth-edge";
import { authConfig } from "@/config/server-config";
import { cookies } from "next/headers";

export interface ReceiptState {
    error?: string;
    receipt?: GenerateReceiptOutput;
}

export async function getReceiptAction(input: GenerateReceiptInput): Promise<ReceiptState> {
  console.log("Frontend: getReceiptAction called with input:", input);
  try {
     const tokens = await getTokens(cookies(), authConfig);
     if (!tokens) {
        return { error: "Unauthorized: You must be logged in to perform this action." };
     }
    const result = await generateReceipt(input);
    console.log("Frontend: Receipt generated successfully for tenant:", input.tenantId);
    return { receipt: result };
  } catch (error: any) {
    console.error("Frontend Action Error: Failed to generate receipt:", error);
    return {
      error: `Failed to generate receipt: ${error.message}`,
    };
  }
}
