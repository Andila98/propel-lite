"use server";

import { generateMessageContent, type GenerateMessageContentInput, type GenerateMessageContentOutput } from "@/ai/flows/generate-message-content";
import { mockProperties, mockTenants } from "@/lib/mock-data";

export type GenerateMessageState = GenerateMessageContentOutput & {
  error?: string;
};

export async function generateMessageAction(input: {
  tenantId: string;
  reminderType: 'rentDue' | 'latePayment' | 'maintenance';
}): Promise<GenerateMessageState> {
  const { tenantId, reminderType } = input;

  const tenant = mockTenants.find(t => t.id === tenantId);
  if (!tenant) {
    return { error: "Tenant not found.", messageContent: "" };
  }

  const property = mockProperties.find(p => p.id === tenant.propertyId);
  if (!property) {
    return { error: "Property not found for this tenant.", messageContent: "" };
  }
  
  const aiInput: GenerateMessageContentInput = {
    propertyName: property.address,
    tenantName: tenant.name,
    reminderType: reminderType,
    leaseDetails: `Lease from ${tenant.leaseStartDate} to ${tenant.leaseEndDate}. Monthly rent is $${property.rent}.`,
    paymentDetails: `Current rent status: ${tenant.rentStatus}. Last payment on ${tenant.paymentHistory[0]?.date || 'N/A'}.`,
    propertyDetails: `${property.bedrooms} bed, ${property.bathrooms} bath, ${property.squareFootage} sqft. ${property.description}`,
  };

  try {
    const result = await generateMessageContent(aiInput);
    return result;
  } catch (error) {
    console.error(error);
    return {
      error: "Failed to generate message content.",
      messageContent: "",
    };
  }
}
