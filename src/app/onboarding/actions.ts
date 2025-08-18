
"use server";

export interface ActionState {
    error?: string;
    success?: boolean;
}

export async function completeOnboarding(): Promise<ActionState> {
  // This is a mock server action as Firebase is removed.
  try {
    console.log("Mock onboarding completion action triggered.");
    return { success: true };
  } catch (error: any) {
    console.error('[MOCK_ONBOARDING_ACTION_ERROR]', error);
    return { error: `Internal Server Error: ${error.message}` };
  }
}
