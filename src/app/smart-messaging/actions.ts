
"use server";

import { generateMessage } from "@/ai/flows/generate-message-flow";
import { firestore, isFirebaseAdminInitialized } from "@/lib/firebase-admin";
import { sendWhatsAppMessage } from "@/lib/whatsapp-service";

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


export type SendWhatsAppState = {
  error?: string;
  successMessage?: string;
};

export async function sendWhatsAppMessageAction(input: { tenantId: string; message: string }): Promise<SendWhatsAppState> {
    if (!isFirebaseAdminInitialized) {
        return { error: "Backend services are not configured." };
    }
    try {
        const tenantDoc = await firestore.collection("tenants").doc(input.tenantId).get();
        if (!tenantDoc.exists) {
            return { error: "Tenant not found." };
        }
        const tenant = tenantDoc.data();
        if (!tenant?.phone) {
            return { error: "Tenant does not have a phone number on file." };
        }

        await sendWhatsAppMessage(tenant.phone, input.message);
        
        return { successMessage: `WhatsApp message simulation sent to ${tenant.name} (${tenant.phone}).` };
        
    } catch (error: any) {
        console.error("[ERROR: sendWhatsAppMessageAction]", error);
        return { error: error.message || "Failed to send WhatsApp message." };
    }
}
