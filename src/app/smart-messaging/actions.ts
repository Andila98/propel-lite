
"use server";

export type GenerateMessageState = {
  error?: string;
  messageContent?: string;
};

export async function generateMessageAction(input: any): Promise<GenerateMessageState> {
  return { error: 'AI features are not configured.' };
}
