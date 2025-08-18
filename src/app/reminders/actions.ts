
"use server";

import { z } from 'zod';
import { generateMessage } from '@/ai/flows/generate-message-flow';
import { handleFlowError } from '@/ai/genkit';
import { ai } from '@/ai/genkit';
import { firestore } from '@/lib/firebase-admin';

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

const ReminderSuggestionOutputSchema = z.object({
  messageContent: z.string().describe("The suggested content for the reminder message."),
  reasoning: z.string().describe("A brief explanation for why this message content was chosen."),
});

const ScheduleSuggestionOutputSchema = z.object({
    reminderDate: z.string().describe("The suggested date for the reminder in YYYY-MM-DD format."),
    reasoning: z.string().describe("A brief explanation for why this date was chosen."),
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
    console.log("Scheduling reminder with data:", values);
    // In a real app, this would save to a 'reminders' collection in Firestore
    // and be picked up by a scheduled function (e.g., Cloud Scheduler).
    return { successMessage: `Reminder for tenant has been successfully scheduled for ${values.scheduledFor}.` };
  } catch (error) {
    return handleFlowError(error, 'scheduleReminderAction');
  }
}

export async function getReminderSuggestionAction(
    input: z.infer<typeof ReminderSuggestionInputSchema>
): Promise<ScheduleReminderState> {
  try {
    const tenant = (await firestore.collection('users').doc(input.tenantId).get()).data();
    if (!tenant) {
      throw new Error("Tenant not found");
    }
    const messageResult = await generateMessage({ tenantName: tenant.name, reminderType: input.reminderType });
    return {
      suggestion: {
        messageContent: messageResult.message,
      }
    };
  } catch (error) {
    return handleFlowError(error, 'getReminderSuggestionAction');
  }
}

export async function getScheduleSuggestionAction(
    input: z.infer<typeof ReminderSuggestionInputSchema>
): Promise<ScheduleReminderState> {
    try {
        const flow = ai.defineFlow(
            {
                name: 'scheduleSuggestionFlow',
                inputSchema: ReminderSuggestionInputSchema,
                outputSchema: ScheduleSuggestionOutputSchema,
            },
            async ({ reminderType }) => {
                const prompt = `You are a property management assistant. Based on standard practices, suggest a good date to send a reminder of type "${reminderType}". Today's date is ${new Date().toISOString().split('T')[0]}. Provide the date and a brief reason.

- For 'rentDue', suggest a date 3-5 days before the 1st of next month.
- For 'leaseRenewal', suggest a date 60 days before a lease ends (assume lease ends in 90 days for this example).
- For 'maintenance', suggest a date for tomorrow.`;

                const { output } = await ai.generate({
                    prompt,
                    model: 'googleai/gemini-1.5-flash',
                    output: { schema: ScheduleSuggestionOutputSchema },
                });
                return output!;
            }
        );

        const result = await flow(input);
        
        return {
            suggestion: {
                messageContent: '', // Not used in this action
                reminderDate: result.reminderDate,
                reasoning: result.reasoning
            }
        };
    } catch (error) {
        return handleFlowError(error, 'getScheduleSuggestionAction');
    }
}
