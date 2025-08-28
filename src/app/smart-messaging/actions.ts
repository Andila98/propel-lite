
"use server";

import { generateMessage } from "@/ai/flows/generate-message-flow";
import { firestore, isFirebaseAdminInitialized } from "@/lib/firebase-admin";

export type GenerateMessageState = {
  error?: string;
  messageContent?: string;
};

export async function generateMessageAction(input: { tenantId: string; reminderType: string}): Promise<GenerateMessageState> {
  if (!isFirebaseAdminInitialized) {
    return { error: "Backend services are not configured. Please contact support." };
  }
  try {
    const tenantDoc = await firestore.collection("tenants").doc(input.tenantId).get();
    if (!tenantDoc.exists) {
        return { error: "Tenant not found."};
    }
    const tenantName = tenantDoc.data()?.name || "there";

    const result = await generateMessage({ tenantName, reminderType: input.reminderType });
    return { messageContent: result.message };
  } catch (error: any) {
    console.error("[ERROR: generateMessageAction]", error);
    return { error: error.message || "Failed to generate message." };
  }
}
