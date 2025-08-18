
"use server";

import { z } from 'zod';
import { generateMessage } from '@/ai/flows/generate-message-flow';
import { generateInvoice, type GenerateInvoiceOutput } from '@/ai/flows/generate-invoice';
import { isFirebaseAdminInitialized, firestore } from '@/lib/firebase-admin';

export const ScheduleReminderFormSchema = z.object({
  tenantId: z.string().min(1, "Tenant is required."),
  reminderType: z.enum(['rentDue', 'leaseRenewal', 'maintenance']),
  scheduledFor: z.string({ required_error: "A date is required."}),
  message: z.string().min(10, "Message is required."),
});
export type ScheduleReminderFormValues = z.infer<typeof ScheduleReminderFormSchema>;

const ReminderSuggestionInputSchema = z.object({
  tenantId: z.string(),
  reminderType: z.enum(['rentDue', 'leaseRenewal', 'maintenance']),
});

export interface ScheduleReminderState {
    error?: string;
    successMessage?: string;
    suggestion?: {
        messageContent: string;
        reminderDate?: string;
        reasoning?: string;
    };
    invoice?: GenerateInvoiceOutput;
}

export async function scheduleReminderAction(
  values: ScheduleReminderFormValues
): Promise<ScheduleReminderState> {
  try {
    if (!isFirebaseAdminInitialized) {
        throw new Error("AI features are not configured. Please contact support.");
    }
    // In a real app, you would save this to a 'reminders' collection
    // or integrate with a task scheduling service like Google Cloud Tasks.
    console.log("Scheduling reminder with data:", values);
    
    // For this prototype, we'll just log it.
    await firestore.collection('reminders').add({
        ...values,
        status: 'scheduled',
        createdAt: firestore.FieldValue.serverTimestamp(),
    });

    return { successMessage: `Reminder for tenant has been successfully scheduled for ${values.scheduledFor}.` };

  } catch (error: any) {
    console.error("[SCHEDULE_REMINDER_ACTION_ERROR]", error);
    return { error: error.message };
  }
}

export async function getReminderSuggestionAction(
    input: z.infer<typeof ReminderSuggestionInputSchema>
): Promise<ScheduleReminderState> {
  try {
    if (!isFirebaseAdminInitialized) {
        throw new Error("AI features are not configured. Please contact support.");
    }

    const tenantDoc = await firestore.collection('users').doc(input.tenantId).get();
    if (!tenantDoc.exists) {
      throw new Error("Tenant not found");
    }
    const tenantName = tenantDoc.data()?.name;

    const [messageRes, invoiceRes] = await Promise.all([
        generateMessage({ tenantName, reminderType: input.reminderType }),
        input.reminderType === 'rentDue' ? generateInvoice({ tenantId: input.tenantId }) : Promise.resolve(null)
    ]);
    
    return {
      suggestion: {
        messageContent: messageRes.message,
      },
      invoice: invoiceRes || undefined
    };

  } catch (error: any) {
    console.error("[GET_REMINDER_SUGGESTION_ACTION_ERROR]", error);
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
                reminderDate.setDate(25); // Assume rent is due on the 1st
                reasoning = "Suggesting a date 3-5 days before the 1st of next month.";
                break;
            case 'leaseRenewal':
                // This would be more complex, needing lease end date
                 reminderDate.setMonth(reminderDate.getMonth() + 1);
                 reasoning = "Suggesting a date one month from now. Adjust based on lease end date.";
                 break;
            case 'maintenance':
                reminderDate.setDate(reminderDate.getDate() + 1);
                reasoning = "Suggesting a date for tomorrow to give tenants notice.";
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
        console.error("[GET_SCHEDULE_SUGGESTION_ACTION_ERROR]", error);
        return { error: error.message };
    }
}
