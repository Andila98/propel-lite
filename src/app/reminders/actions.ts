
"use server";

import { generateMessageContent, type GenerateMessageContentInput } from "@/ai/flows/generate-message-content";
import { generateReminderSchedule, type GenerateReminderScheduleInput } from "@/ai/flows/generate-reminder-schedule";
import { generateInvoice, type GenerateInvoiceInput, type GenerateInvoiceOutput } from "@/ai/flows/generate-invoice";
import { z } from "zod";
import { db } from "@/lib/firebase-admin";
import type { Tenant, Property } from "@/lib/types";

const ScheduleReminderFormSchema = z.object({
  tenantId: z.string().min(1, "Tenant is required."),
  reminderType: z.enum(['rentDue', 'leaseRenewal', 'maintenance']),
  scheduledFor: z.string().min(1, "Schedule date is required."),
});
export type ScheduleReminderFormValues = z.infer<typeof ScheduleReminderFormSchema>;

export interface ScheduleReminderState {
    error?: string;
    successMessage?: string;
    suggestion?: {
        messageContent: string;
    };
    invoice?: GenerateInvoiceOutput;
}


export async function scheduleReminderAction(
  values: ScheduleReminderFormValues
): Promise<ScheduleReminderState> {
  try {
    console.log("Scheduling reminder with values:", values);
    // In a real app, you would save this to a database and have a cron job process it.
    // For now, we'll just log it and return a success message.
    return {
      successMessage: `Reminder scheduled for ${values.tenantId} on ${values.scheduledFor}.`,
    };
  } catch (error: any) {
    console.error("Backend: Error in scheduleReminderAction", error);
    return { error: `Failed to schedule reminder: ${error.message}` };
  }
}


export async function getReminderSuggestionAction(input: {
  tenantId: string;
  reminderType: 'rentDue' | 'leaseRenewal' | 'maintenance';
}): Promise<ScheduleReminderState> {
  const { tenantId, reminderType } = input;

  const tenantDoc = await db.collection('tenants').doc(tenantId).get();
  if (!tenantDoc.exists) {
    console.error(`Backend: Tenant not found for ID: ${tenantId}`);
    return { error: "Tenant not found." };
  }
  const tenant = tenantDoc.data() as Tenant;

  const propertyDoc = await db.collection('properties').doc(tenant.propertyId).get();
  if (!propertyDoc.exists) {
    console.error(`Backend: Property not found for tenant ID: ${tenantId}`);
    return { error: "Property not found for this tenant." };
  }
  const property = propertyDoc.data() as Property;
  
  const messageInput: GenerateMessageContentInput = {
    propertyName: property.address,
    tenantName: tenant.name,
    reminderType: reminderType,
    leaseDetails: `Lease from ${tenant.leaseStartDate} to ${tenant.leaseEndDate}. Monthly rent is $${property.rent}.`,
    paymentDetails: `Current rent status: ${tenant.rentStatus}. Last payment on ${tenant.paymentHistory[0]?.date || 'N/A'}.`,
    propertyDetails: `${property.bedrooms} bed, ${property.bathrooms} bath, ${property.squareFootage} sqft.`,
  };

  try {
    console.log("Backend: Generating message content for:", input);
    const messageResult = await generateMessageContent(messageInput);

    let invoiceResult: GenerateInvoiceOutput | undefined = undefined;
    if (reminderType === 'rentDue') {
        const invoiceInput: GenerateInvoiceInput = {
            tenantId: tenant.id,
            propertyId: property.id,
            dueDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
        };
        console.log("Backend: Generating invoice for:", invoiceInput);
        invoiceResult = await generateInvoice(invoiceInput);
    }
    
    return { suggestion: messageResult, invoice: invoiceResult };
  } catch (error: any) {
    console.error("Backend: Failed to generate AI suggestions:", error);
    return {
      error: `Failed to generate AI suggestions: ${error.message}`,
    };
  }
}

export async function getScheduleSuggestionAction(input: {
  tenantId: string;
  reminderType: 'rentDue' | 'leaseRenewal' | 'maintenance';
}) {
    const { tenantId, reminderType } = input;
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
     if (!tenantDoc.exists) {
        console.error(`Backend: Tenant not found for ID: ${tenantId}`);
        return { error: "Tenant not found." };
    }
    const tenant = tenantDoc.data() as Tenant;

    const scheduleInput: GenerateReminderScheduleInput = {
        reminderType,
        leaseEndDate: tenant.leaseEndDate,
        rentDueDate: 1, // Assuming rent is due on the 1st
    };
     try {
        console.log("Backend: Generating schedule suggestion for:", scheduleInput);
        const scheduleResult = await generateReminderSchedule(scheduleInput);
        return { suggestion: scheduleResult };
    } catch (error: any) {
        console.error("Backend: Failed to generate schedule suggestion:", error);
        return {
            error: `Failed to generate schedule suggestion: ${error.message}`,
        };
    }
}
