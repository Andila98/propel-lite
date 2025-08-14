
"use server";

import { generateMessage } from "@/ai/flows/generate-message-flow";

export type GenerateMessageState = {
  error?: string;
  messageContent?: string;
};

export async function generateMessageAction(input: any): Promise<GenerateMessageState> {
  try {
    const result = await generateMessage(input);
    return { messageContent: result.message };
  } catch (error: any) {
    console.error("Error in generateMessageAction:", error);
    return { error: error.message || "Failed to generate message." };
  }
}
