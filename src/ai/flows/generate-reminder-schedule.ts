
'use server';
/**
 * @fileOverview A flow that suggests a schedule for tenant reminders.
 *
 * - generateReminderSchedule - A function that suggests a reminder date based on reminder type and lease info.
 * - GenerateReminderScheduleInput - The input type for the generateReminderSchedule function.
 * - GenerateReminderScheduleOutput - The return type for the generateReminderSchedule function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateReminderScheduleInputSchema = z.object({
  reminderType: z.enum(['rentDue', 'leaseRenewal', 'maintenance']).describe('The type of reminder.'),
  leaseEndDate: z.string().describe('The lease end date in YYYY-MM-DD format.'),
  rentDueDate: z.number().describe('The day of the month rent is due (e.g., 1 for the 1st).'),
});
export type GenerateReminderScheduleInput = z.infer<typeof GenerateReminderScheduleInputSchema>;

const GenerateReminderScheduleOutputSchema = z.object({
  // ISO 8601 date string
  reminderDate: z.string().describe('The suggested date for the reminder in YYYY-MM-DD format.'),
  reasoning: z.string().describe('The reasoning for the suggested date.'),
});
export type GenerateReminderScheduleOutput = z.infer<typeof GenerateReminderScheduleOutputSchema>;

export async function generateReminderSchedule(input: GenerateReminderScheduleInput): Promise<GenerateReminderScheduleOutput> {
  try {
    return await generateReminderScheduleFlow(input);
  } catch (error: any) {
    console.error(`[generateReminderSchedule] Error: Failed to generate schedule for type ${input.reminderType}`, error);
    throw new Error(`Failed to generate reminder schedule: ${error.message}`);
  }
}

const prompt = ai.definePrompt({
  name: 'generateReminderSchedulePrompt',
  input: {schema: GenerateReminderScheduleInputSchema},
  output: {schema: GenerateReminderScheduleOutputSchema},
  prompt: `You are an intelligent assistant for property managers. Your task is to suggest an optimal date to send a reminder to a tenant based on the reminder type and lease information. Today's date is ${new Date().toISOString().split('T')[0]}.

  Reminder Type: {{{reminderType}}}
  Lease End Date: {{{leaseEndDate}}}
  Rent Due Day of Month: {{{rentDueDate}}}

  Follow these rules for scheduling:
  - For 'rentDue' reminders, suggest a date 3-5 days before the rent due date of the current or next month.
  - For 'leaseRenewal' reminders, suggest a date 60 days before the lease end date.
  - For 'maintenance' reminders, suggest a date for tomorrow.

  Provide the suggested date and a brief explanation for your choice.`,
});

const generateReminderScheduleFlow = ai.defineFlow(
  {
    name: 'generateReminderScheduleFlow',
    inputSchema: GenerateReminderScheduleInputSchema,
    outputSchema: GenerateReminderScheduleOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
