
"use server";

import { z } from 'zod';
import { mockTenants } from '@/lib/mock-data';

export const ScheduleReminderFormSchema = z.object({
  tenantId: z.string().min(1, "Tenant is required."),
  reminderType: z.enum(['rentDue', 'latePayment', 'maintenance']),
  scheduledFor: z.string({ required_error: "A date is required."}),
  message: z.string().min(10, "Message is required."),
});
export type ScheduleReminderFormValues = z.infer<typeof ScheduleReminderFormSchema>;

const ReminderSuggestionInputSchema = z.object({
  tenantId: z.string(),
  reminderType: z.enum(['rentDue', 'latePayment', 'maintenance']),
});

export interface ScheduleReminderState {
    error?: string;
    successMessage?: string;
    suggestion?: {
        messageContent: string;
        reminderDate?: string;
        reasoning?: string;
    };
}

export async function scheduleReminderAction(
  values: ScheduleReminderFormValues
): Promise<ScheduleReminderState> {
  try {
    console.log("Scheduling reminder with data (mock):", values);
    return { successMessage: `Reminder for tenant has been successfully scheduled for ${values.scheduledFor}.` };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getReminderSuggestionAction(
    input: z.infer<typeof ReminderSuggestionInputSchema>
): Promise<ScheduleReminderState> {
  try {
    const tenant = mockTenants.find(t => t.id === input.tenantId);
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    let message = '';
    switch(input.reminderType) {
        case 'rentDue':
            message = `Hi ${tenant.name}, just a friendly reminder that your rent is due soon. Thanks!`;
            break;
        case 'latePayment':
            message = `Hi ${tenant.name}, this is a notice that your rent payment is now overdue. Please submit payment as soon as possible.`;
            break;
        case 'maintenance':
            message = `Hi ${tenant.name}, this is to inform you of scheduled maintenance in the building next week. We appreciate your cooperation.`;
            break;
    }

    return {
      suggestion: {
        messageContent: message,
      }
    };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getScheduleSuggestionAction(
    input: z.infer<typeof ReminderSuggestionInputSchema>
): Promise<ScheduleReminderState> {
    try {
        let reminderDate = new Date();
        let reasoning = '';
        switch(input.reminderType) {
            case 'rentDue':
                reminderDate.setDate(25);
                reasoning = "Suggesting a date 3-5 days before the 1st of next month.";
                break;
            case 'maintenance':
                reminderDate.setDate(reminderDate.getDate() + 1);
                reasoning = "Suggesting a date for tomorrow.";
                break;
            default:
                reminderDate.setDate(15);
                reasoning = "Suggesting a default date."
        }

        return {
            suggestion: {
                messageContent: '', // Not used in this action
                reminderDate: reminderDate.toISOString().split('T')[0],
                reasoning
            }
        };
    } catch (error: any) {
        return { error: error.message };
    }
}
