
"use server";

import { generateMessage } from "@/ai/flows/generate-message-flow";
import { firestore, isFirebaseAdminInitialized } from "@/lib/firebase-admin";

export type GenerateMessageState = {
  error?: string;
  messageContent?: string;
};

export async function generateMessageAction(input: { tenantId: string; reminderType: string}): Promise<GenerateMessageState> {
  if (!isFirebaseAdminInitialized) {
    console.error("[GENERATE_MESSAGE_ACTION] AI features are not configured.");
    return { error: "AI features are not configured. Please contact support." };
  }

  try {
    const tenantDoc = await firestore.collection("tenants").doc(input.tenantId).get();
    if (!tenantDoc.exists) {
        return { error: "Tenant not found."};
    }
    const tenantName = tenantDoc.data()?.name || "there";
    
    console.log(`[GENERATE_MESSAGE_ACTION] Generating message for tenant ${tenantName}, type: ${input.reminderType}`);

    const result = await generateMessage({ tenantName, reminderType: input.reminderType });
    return { messageContent: result.message };
  } catch (error: any) {
    console.error("Error in generateMessageAction:", error);
    return { error: error.message || "Failed to generate message." };
  }
}
