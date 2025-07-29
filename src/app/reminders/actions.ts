
"use server";

import { generateMessageContent, type GenerateMessageContentInput } from "@/ai/flows/generate-message-content";
import { generateReminderSchedule, type GenerateReminderScheduleInput } from "@/ai/flows/generate-reminder-schedule";
import { generateInvoice, type GenerateInvoiceInput, type GenerateInvoiceOutput } from "@/ai/flows/generate-invoice";
import { mockProperties, mockTenants } from "@/lib/mock-data";
import { z } from "zod";

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
  console.log("Scheduling reminder with values:", values);
  // In a real app, you would save this to a database and have a cron job process it.
  // For now, we'll just log it and return a success message.
  return {
    successMessage: `Reminder scheduled for ${values.tenantId} on ${values.scheduledFor}.`,
  };
}


export async function getReminderSuggestionAction(input: {
  tenantId: string;
  reminderType: 'rentDue' | 'leaseRenewal' | 'maintenance';
}): Promise<ScheduleReminderState> {
  const { tenantId, reminderType } = input;

  const tenant = mockTenants.find(t => t.id === tenantId);
  if (!tenant) {
    return { error: "Tenant not found." };
  }

  const property = mockProperties.find(p => p.id === tenant.propertyId);
  if (!property) {
    return { error: "Property not found for this tenant." };
  }
  
  const messageInput: GenerateMessageContentInput = {
    propertyName: property.address,
    tenantName: tenant.name,
    reminderType: reminderType,
    leaseDetails: `Lease from ${tenant.leaseStartDate} to ${tenant.leaseEndDate}. Monthly rent is $${property.rent}.`,
    paymentDetails: `Current rent status: ${tenant.rentStatus}. Last payment on ${tenant.paymentHistory[0]?.date || 'N/A'}.`,
    propertyDetails: `${property.bedrooms} bed, ${property.bathrooms} bath, ${property.squareFootage} sqft.`,
  };

  try {
    const messageResult = await generateMessageContent(messageInput);

    let invoiceResult: GenerateInvoiceOutput | undefined = undefined;
    if (reminderType === 'rentDue') {
        const invoiceInput: GenerateInvoiceInput = {
            tenantId: tenant.id,
            propertyId: property.id,
            dueDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
        };
        invoiceResult = await generateInvoice(invoiceInput);
    }
    
    return { suggestion: messageResult, invoice: invoiceResult };
  } catch (error) {
    console.error(error);
    return {
      error: "Failed to generate AI suggestions.",
    };
  }
}

export async function getScheduleSuggestionAction(input: {
  tenantId: string;
  reminderType: 'rentDue' | 'leaseRenewal' | 'maintenance';
}) {
    const { tenantId, reminderType } = input;
    const tenant = mockTenants.find(t => t.id === tenantId);
     if (!tenant) {
        return { error: "Tenant not found." };
    }
    const scheduleInput: GenerateReminderScheduleInput = {
        reminderType,
        leaseEndDate: tenant.leaseEndDate,
        rentDueDate: 1, // Assuming rent is due on the 1st
    };
     try {
        const scheduleResult = await generateReminderSchedule(scheduleInput);
        return { suggestion: scheduleResult };
    } catch (error) {
        console.error(error);
        return {
            error: "Failed to generate schedule suggestion.",
        };
    }
}
