
"use server";

export interface ScheduleReminderState {
    error?: string;
    successMessage?: string;
    suggestion?: {
        messageContent: string;
    };
    invoice?: any;
}


export async function scheduleReminderAction(
  values: any
): Promise<ScheduleReminderState> {
  return { error: 'AI features are not configured.' };
}


export async function getReminderSuggestionAction(input: any): Promise<ScheduleReminderState> {
  return { error: "AI features are not configured." };
}

export async function getScheduleSuggestionAction(input: any) {
  return { error: "AI features are not configured." };
}
