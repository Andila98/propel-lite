
"use server";

export type PriceSuggestionState = {
  error?: string;
  suggestion?: any;
};

export async function suggestPriceAction(
  input: any,
): Promise<PriceSuggestionState> {
  console.log("Backend: suggestPriceAction server action received input:", input);
  return { error: 'AI features are not configured.' };
}
