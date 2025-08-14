
"use server";

import type { GenerateInvoiceOutput } from '@/ai/flows/generate-invoice';
import { z } from 'zod';

export const ScheduleReminderFormSchema = z.object({
  tenantId: z.string().min(1, "Tenant is required."),
  reminderType: z.enum(['rentDue', 'leaseRenewal', 'maintenance']),
  scheduledFor: z.date({ required_error: "A date is required."}),
  message: z.string().min(10, "Message is required."),
});

export type ScheduleReminderFormValues = z.infer<typeof ScheduleReminderFormSchema>;

export interface ScheduleReminderState {
    error?: string;
    successMessage?: string;
    suggestion?: {
        messageContent: string;
        reminderDate?: string;
        reasoning?: string;
    };
    invoice?: any;
}


export async function scheduleReminderAction(
  values: ScheduleReminderFormValues
): Promise<ScheduleReminderState> {
  // This is where the problematic .reduce() call was.
  // The AI functionality is not yet implemented.
  // Returning a clear error message is the correct behavior for now.
  console.log("scheduleReminderAction called with:", values);
  return { error: 'AI features are not configured.' };
}


export async function getReminderSuggestionAction(input: any): Promise<ScheduleReminderState> {
  return { error: "AI features are not configured." };
}

export async function getScheduleSuggestionAction(input: any): Promise<ScheduleReminderState> {
  return { error: "AI features are not configured." };
}
