
"use server";

import { z } from 'zod';
import { generateMessage } from '@/ai/flows/generate-message-flow';
import { generateInvoice, type GenerateInvoiceOutput } from '@/ai/flows/generate-invoice-flow';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { ScheduleReminderFormSchema, type ScheduleReminderFormValues } from '@/lib/schemas';

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
  if (!isFirebaseAdminInitialized) {
    return { error: "Cannot schedule reminder: Server is not configured. Please check credentials." };
  }

  const validationResult = ScheduleReminderFormSchema.safeParse(values);
  if (!validationResult.success) {
    return { error: "Invalid data provided." };
  }
  
  try {
    // In a real app, you would save this to a 'reminders' collection
    // or integrate with a task scheduling service like Google Cloud Tasks.
    console.log("Scheduling reminder with data:", validationResult.data);
    
    await firestore.collection('reminders').add({
        ...validationResult.data,
        scheduledFor: new Date(validationResult.data.scheduledFor),
        status: 'scheduled',
        createdAt: firestore.FieldValue.serverTimestamp(),
    });

    return { successMessage: `Reminder for tenant has been successfully scheduled for ${validationResult.data.scheduledFor}.` };

  } catch (error: any) {
    console.error("[SCHEDULE_REMINDER_ACTION_ERROR]", error);
    return { error: error.message };
  }
}

export async function getReminderSuggestionAction(
    input: z.infer<typeof ReminderSuggestionInputSchema>
): Promise<ScheduleReminderState> {
  if (!isFirebaseAdminInitialized) {
    return { error: "AI features are not configured. Please check server credentials." };
  }
  try {
    const tenantDoc = await firestore.collection('tenants').doc(input.tenantId).get();
    if (!tenantDoc.exists) {
      throw new Error("Tenant not found");
    }
    const tenantName = tenantDoc.data()?.name;
    
    console.log(`[GET_REMINDER_SUGGESTION_ACTION] Generating suggestion for tenant ${tenantName}, type: ${input.reminderType}`);

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
        
        console.log(`[GET_SCHEDULE_SUGGESTION_ACTION] Suggested date: ${reminderDate.toISOString()}`);

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
