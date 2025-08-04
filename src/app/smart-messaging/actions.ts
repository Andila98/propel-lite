
"use server";

import { generateMessageContent, type GenerateMessageContentInput, type GenerateMessageContentOutput } from "@/ai/flows/generate-message-content";
import { db } from "@/lib/firebase-admin";
import type { Property, Tenant } from "@/lib/types";


export type GenerateMessageState = {
  error?: string;
  messageContent?: string;
};

export async function generateMessageAction(input: {
  tenantId: string;
  reminderType: 'rentDue' | 'latePayment' | 'maintenance';
}): Promise<GenerateMessageState> {
  const { tenantId, reminderType } = input;
  console.log("Backend: generateMessageAction called with input:", input);

  try {
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) {
      console.error(`Backend Error: Tenant not found for ID: ${tenantId}`);
      return { error: "Tenant not found." };
    }
    const tenant = tenantDoc.data() as Tenant;

    const propertyDoc = await db.collection('properties').doc(tenant.propertyId).get();
    if (!propertyDoc.exists) {
      console.error(`Backend Error: Property not found for tenant with ID: ${tenantId}`);
      return { error: "Property not found for this tenant." };
    }
    const property = propertyDoc.data() as Property;
    
    const aiInput: GenerateMessageContentInput = {
      propertyName: property.address,
      tenantName: tenant.name,
      reminderType: reminderType,
      leaseDetails: `Lease from ${tenant.leaseStartDate} to ${tenant.leaseEndDate}. Monthly rent is $${property.rent}.`,
      paymentDetails: `Current rent status: ${tenant.rentStatus}. Last payment on ${tenant.paymentHistory[0]?.date || 'N/A'}.`,
      propertyDetails: `${property.bedrooms} bed, ${property.bathrooms} bath, ${property.squareFootage} sqft. ${property.description}`,
    };

    console.log("Backend: Calling generateMessageContent flow with:", aiInput);
    const result = await generateMessageContent(aiInput);
    console.log("Backend: Message content generated successfully.");
    return { messageContent: result.messageContent };
  } catch (error: any) {
    console.error("Backend Error: Failed to generate message content:", error);
    return {
      error: `Failed to generate message content: ${error.message}`,
    };
  }
}
